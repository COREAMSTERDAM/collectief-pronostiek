import "server-only";

const SERIES_ID = "CHP_136062";
const GRAPHQL_URL = "https://datalake-prod2018.rbfa.be/graphql";
const RANKING_URL = `https://www.rbfa.be/nl/competitie/${SERIES_ID}/rangschikking`;
const CALENDAR_URL = `https://www.rbfa.be/nl/competitie/${SERIES_ID}/kalender`;

const PERSISTED = {
  GetTeamCalendar: {
    variable: "teamId",
    hash: "3f0441e6723b9852b4f0cff2c872f4aa674c5de2d23589efc70c7a4ffb7f6383",
  },
  GetSeriesRankings: {
    variable: "seriesId",
    hash: "0a53124a9bc8872b686f22d80fd545622dbaf4b27a7596e1207b097b92c87953",
  },
} as const;

export type VvaMatch = {
  id?: string;
  round: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  score: string | null;
  state?: string | null;
};

export type VvaStanding = {
  position: number;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type VvaClubData = {
  source: string;
  sourceUrl: string;
  season: string;
  competition: string;
  matches: VvaMatch[];
  standings: VvaStanding[];
  fetchedAt: string;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    return Number(value);
  }
  return null;
}

function firstNumber(record: JsonRecord | null, keys: string[], fallback = 0) {
  if (!record) return fallback;
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return fallback;
}

function decodeHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&eacute;/gi, "é")
    .replace(/&euml;/gi, "ë")
    .replace(/&auml;/gi, "ä")
    .replace(/&uuml;/gi, "ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&agrave;/gi, "à")
    .replace(/&egrave;/gi, "è")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rowsFromHtml(html: string): string[][] {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map((match) =>
      [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (cell) => decodeHtml(cell[1]),
      ),
    )
    .filter((cells) => cells.length > 0);
}

function normalizeTeam(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTeamKey(value: string) {
  return normalizeTeam(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bkoninklijke\b/g, "")
    .replace(/\b(k|r)\.?\s?(fc|sv|sk|vv|vc|vk)\.?\b/g, "")
    .replace(/\s+a$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isVvaSeries(series: JsonRecord | null) {
  if (!series) return false;
  const id = asString(series.id);
  const name = asString(series.name).toLowerCase();
  return (
    id === SERIES_ID ||
    id === SERIES_ID.replace(/^CHP_/, "") ||
    /2(de|e|nd)\s+afdeling.*(vv|voetb.*vl).*a/.test(name)
  );
}

async function fetchPersisted(
  operation: keyof typeof PERSISTED,
  value: string | number,
): Promise<JsonRecord> {
  const config = PERSISTED[operation];
  const params = new URLSearchParams({
    operationName: operation,
    variables: JSON.stringify({ [config.variable]: String(value), language: "nl" }),
    extensions: JSON.stringify({
      persistedQuery: { version: 1, sha256Hash: config.hash },
    }),
  });

  const response = await fetch(`${GRAPHQL_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json",
      "x-apollo-operation-name": operation,
      "apollo-require-preflight": "true",
      "user-agent": "CollectiefWitEnZwet/1.0 (+https://app.collectiefwitenzwet.be)",
    },
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(`RBFA databron antwoordde met ${response.status}.`);
  }

  const json = (await response.json()) as JsonRecord;
  if (!asRecord(json.data)) {
    const errors = asArray(json.errors)
      .map((item) => asString(asRecord(item)?.message))
      .filter(Boolean)
      .join("; ");
    throw new Error(errors || "RBFA databron gaf geen data terug.");
  }

  return json;
}

function rankingTeamsFromGraphql(json: JsonRecord) {
  const data = asRecord(json.data);
  const seriesRankings = asRecord(data?.seriesRankings);
  const rankings = asArray(seriesRankings?.rankings);
  const first = asRecord(rankings[0]);
  return asArray(first?.teams).map(asRecord).filter(Boolean) as JsonRecord[];
}

function standingsFromGraphql(teams: JsonRecord[]): VvaStanding[] {
  return teams
    .map((team) => ({
      position: firstNumber(team, ["position", "rank", "ranking"]),
      team: normalizeTeam(asString(team.name)),
      played: firstNumber(team, ["played", "matchesPlayed", "gamesPlayed", "matches"]),
      wins: firstNumber(team, ["wins", "won", "matchesWon"]),
      draws: firstNumber(team, ["draws", "drawn", "matchesDrawn"]),
      losses: firstNumber(team, ["losses", "lost", "matchesLost"]),
      goalsFor: firstNumber(team, ["goalsFor", "goalsScored", "scored", "goalsMade"]),
      goalsAgainst: firstNumber(team, ["goalsAgainst", "goalsConceded", "conceded"]),
      points: firstNumber(team, ["points", "pts", "totalPoints"]),
    }))
    .filter((row) => row.position > 0 && row.team)
    .sort((a, b) => a.position - b.position);
}

function parseOfficialRankingHtml(html: string): VvaStanding[] {
  const rows = rowsFromHtml(html);
  const result: VvaStanding[] = [];

  for (const cells of rows) {
    // Officiële RBFA-tabel: # | Ploeg | PTN | M | W | V | G | + | - | +/- | PTN
    if (cells.length < 9 || !/^\d{1,2}$/.test(cells[0] ?? "")) continue;
    const position = Number(cells[0]);
    if (position < 1 || position > 30) continue;

    const numeric = cells.slice(2).map((cell) => asNumber(cell));
    if (numeric.filter((value) => value !== null).length < 7) continue;

    result.push({
      position,
      team: normalizeTeam(cells[1] ?? ""),
      points: Number(numeric[0] ?? numeric.at(-1) ?? 0),
      played: Number(numeric[1] ?? 0),
      wins: Number(numeric[2] ?? 0),
      losses: Number(numeric[3] ?? 0),
      draws: Number(numeric[4] ?? 0),
      goalsFor: Number(numeric[5] ?? 0),
      goalsAgainst: Number(numeric[6] ?? 0),
    });
  }

  return result
    .filter((row) => row.team)
    .sort((a, b) => a.position - b.position)
    .slice(0, 16);
}

async function fetchOfficialRankingHtml() {
  const response = await fetch(RANKING_URL, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0)",
    },
    next: { revalidate: 900 },
  });
  return response.ok ? response.text() : "";
}

type MatchAccumulator = {
  id: string;
  startTime: string;
  homeTeam: string;
  awayTeam: string;
  score: string | null;
  state: string | null;
  roundHints: number[];
};

function getCalendarItems(json: JsonRecord) {
  const data = asRecord(json.data);
  return asArray(data?.teamCalendar).map(asRecord).filter(Boolean) as JsonRecord[];
}

function explicitRound(item: JsonRecord): number | null {
  for (const key of ["round", "matchday", "matchDay", "day", "channel"]) {
    const value = asNumber(item[key]);
    if (value !== null && value >= 1 && value <= 30) return Math.trunc(value);
  }
  const series = asRecord(item.series);
  if (series) {
    for (const key of ["round", "matchday", "matchDay", "day"]) {
      const value = asNumber(series[key]);
      if (value !== null && value >= 1 && value <= 30) return Math.trunc(value);
    }
  }
  return null;
}

function itemToMatch(item: JsonRecord) {
  const home = asRecord(item.homeTeam);
  const away = asRecord(item.awayTeam);
  const outcome = asRecord(item.outcome);
  const series = asRecord(item.series);
  const id = asString(item.id);
  const startTime = asString(item.startTime);
  const homeTeam = normalizeTeam(asString(home?.name));
  const awayTeam = normalizeTeam(asString(away?.name));

  if (!id || !startTime || !homeTeam || !awayTeam || !isVvaSeries(series)) return null;

  const homeGoals = asNumber(outcome?.homeTeamGoals);
  const awayGoals = asNumber(outcome?.awayTeamGoals);

  return {
    id,
    startTime,
    homeTeam,
    awayTeam,
    score: homeGoals !== null && awayGoals !== null ? `${homeGoals}-${awayGoals}` : null,
    state: asString(item.state) || null,
    explicitRound: explicitRound(item),
  };
}

function assignMatchesFromCalendars(calendars: JsonRecord[][]): VvaMatch[] {
  const matches = new Map<string, MatchAccumulator>();

  for (const calendar of calendars) {
    const leagueItems = calendar
      .map(itemToMatch)
      .filter(Boolean)
      .sort((a, b) => a!.startTime.localeCompare(b!.startTime)) as NonNullable<ReturnType<typeof itemToMatch>>[];

    leagueItems.forEach((item, index) => {
      const inferredRound = item.explicitRound ?? index + 1;
      const existing = matches.get(item.id);
      if (existing) {
        existing.roundHints.push(inferredRound);
        if (!existing.score && item.score) existing.score = item.score;
        if (!existing.state && item.state) existing.state = item.state;
        return;
      }

      matches.set(item.id, {
        id: item.id,
        startTime: item.startTime,
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        score: item.score,
        state: item.state,
        roundHints: [inferredRound],
      });
    });
  }

  return [...matches.values()]
    .map((match) => {
      const counts = new Map<number, number>();
      match.roundHints.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
      const round = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 1;
      const parsed = new Date(match.startTime);
      const date = Number.isNaN(parsed.getTime())
        ? match.startTime.slice(0, 10)
        : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
      const time = Number.isNaN(parsed.getTime())
        ? match.startTime.slice(11, 16)
        : `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;

      return {
        id: match.id,
        round,
        date,
        time,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        score: match.score,
        state: match.state,
      } satisfies VvaMatch;
    })
    .filter((match) => match.round >= 1 && match.round <= 30)
    .sort((a, b) => a.round - b.round || a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

async function fetchCalendars(teamIds: string[]) {
  const uniqueIds = [...new Set(teamIds.filter(Boolean))];
  const results = await Promise.allSettled(
    uniqueIds.map(async (teamId) => getCalendarItems(await fetchPersisted("GetTeamCalendar", teamId))),
  );

  const calendars = results
    .filter((result): result is PromiseFulfilledResult<JsonRecord[]> => result.status === "fulfilled")
    .map((result) => result.value);

  if (!calendars.length) {
    throw new Error("De officiële RBFA-kalenders konden niet worden opgehaald.");
  }

  return calendars;
}

export async function fetchVvaClubData(): Promise<VvaClubData> {
  // 1) Officiële rangschikking levert ook de interne RBFA-team-ID's op.
  const rankingJson = await fetchPersisted("GetSeriesRankings", SERIES_ID);
  const rankingTeams = rankingTeamsFromGraphql(rankingJson);
  const teamIds = rankingTeams.map((team) => asString(team.teamId)).filter(Boolean);

  if (teamIds.length < 8) {
    throw new Error("RBFA gaf onvoldoende ploegen terug voor 2e Afdeling VV A.");
  }

  // 2) Haal voor elke ploeg de officiële kalender op en dedupliceer op wedstrijd-ID.
  const calendars = await fetchCalendars(teamIds);
  const matches = assignMatchesFromCalendars(calendars);

  if (matches.length < 100) {
    throw new Error("De officiële RBFA-kalender kon niet volledig worden opgebouwd.");
  }

  // 3) Gebruik officiële ranking-HTML voor de volledige W/G/V/doelpuntenstatistiek.
  //    Als RBFA die tabel tijdelijk niet rendert, vallen we terug op de GraphQL-data.
  const rankingHtml = await fetchOfficialRankingHtml();
  const htmlStandings = rankingHtml ? parseOfficialRankingHtml(rankingHtml) : [];
  const graphStandings = standingsFromGraphql(rankingTeams);
  const standings = htmlStandings.length >= 8 ? htmlStandings : graphStandings;

  return {
    source: "Voetbal Vlaanderen / RBFA",
    sourceUrl: CALENDAR_URL,
    season: "2026-2027",
    competition: "2e Afdeling VV A",
    matches,
    standings,
    fetchedAt: new Date().toISOString(),
  };
}
