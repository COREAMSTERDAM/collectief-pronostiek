import "server-only";

import { fetchVvaClubData, type VvaClubData, type VvaMatch, type VvaStanding } from "@/src/lib/vva-club-data";

export type MatchRow = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
};

export type AiPreviewContent = {
  title: string;
  intro: string;
  quickFacts: Array<{ label: string; value: string }>;
  patterns: Array<{ title: string; text: string }>;
  recentFormSummary: string;
  styleAnalysis: string;
  dangers: Array<{ title: string; text: string }>;
  pressurePoints: Array<{ title: string; text: string }>;
  caveat: string;
  sources: string[];
};

type PreviewFacts = {
  match: {
    id: number;
    homeTeam: string;
    awayTeam: string;
    kickoff: string;
    competition: string;
    round: number | null;
  };
  opponent: {
    name: string;
    standing: VvaStanding | null;
    recentMatches: Array<{
      date: string;
      homeTeam: string;
      awayTeam: string;
      score: string | null;
      resultForOpponent: "W" | "G" | "V" | null;
    }>;
    recentSummary: {
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
    };
  };
  eendracht: {
    standing: VvaStanding | null;
  };
  sourceNotes: string[];
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(koninklijke|kfc|ksv|kvk|krc|rfc|rc|fc|sv|sk|vv|vc|vk)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isEendracht(name: string) {
  const key = normalize(name);
  return key.includes("eendracht aalst lede") || key === "eendracht aalst";
}

function teamEquals(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);
  return left === right || left.includes(right) || right.includes(left);
}

function parseScore(score: string | null) {
  if (!score) return null;
  const match = score.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (!match) return null;
  return { home: Number(match[1]), away: Number(match[2]) };
}

function resultForTeam(match: VvaMatch, team: string): "W" | "G" | "V" | null {
  const score = parseScore(match.score);
  if (!score) return null;
  const home = teamEquals(match.homeTeam, team);
  const away = teamEquals(match.awayTeam, team);
  if (!home && !away) return null;
  const mine = home ? score.home : score.away;
  const theirs = home ? score.away : score.home;
  return mine > theirs ? "W" : mine < theirs ? "V" : "G";
}

function goalsForTeam(match: VvaMatch, team: string) {
  const score = parseScore(match.score);
  if (!score) return null;
  const home = teamEquals(match.homeTeam, team);
  const away = teamEquals(match.awayTeam, team);
  if (!home && !away) return null;
  return home
    ? { goalsFor: score.home, goalsAgainst: score.away }
    : { goalsFor: score.away, goalsAgainst: score.home };
}

function findStanding(data: VvaClubData, name: string) {
  return data.standings.find((row) => teamEquals(row.team, name)) ?? null;
}

function findLeagueMatch(data: VvaClubData, match: MatchRow) {
  const targetDate = match.kickoff.slice(0, 10);
  return data.matches.find((item) => {
    const sameTeams =
      teamEquals(item.homeTeam, match.home_team) && teamEquals(item.awayTeam, match.away_team);
    return sameTeams && (!targetDate || item.date === targetDate);
  }) ?? data.matches.find(
    (item) => teamEquals(item.homeTeam, match.home_team) && teamEquals(item.awayTeam, match.away_team),
  ) ?? null;
}

export async function buildPreviewFacts(match: MatchRow): Promise<PreviewFacts> {
  const data = await fetchVvaClubData();
  const opponent = isEendracht(match.home_team) ? match.away_team : match.home_team;
  const leagueMatch = findLeagueMatch(data, match);
  const kickoffMs = new Date(match.kickoff).getTime();

  const recent = data.matches
    .filter((item) => teamEquals(item.homeTeam, opponent) || teamEquals(item.awayTeam, opponent))
    .filter((item) => parseScore(item.score) !== null)
    .filter((item) => {
      const date = new Date(`${item.date}T${item.time || "00:00"}:00`).getTime();
      return Number.isNaN(kickoffMs) || Number.isNaN(date) || date < kickoffMs;
    })
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .slice(0, 5);

  const summary = recent.reduce(
    (acc, item) => {
      const result = resultForTeam(item, opponent);
      const goals = goalsForTeam(item, opponent);
      acc.played += 1;
      if (result === "W") acc.wins += 1;
      if (result === "G") acc.draws += 1;
      if (result === "V") acc.losses += 1;
      if (goals) {
        acc.goalsFor += goals.goalsFor;
        acc.goalsAgainst += goals.goalsAgainst;
      }
      return acc;
    },
    { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 },
  );

  return {
    match: {
      id: match.id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      kickoff: match.kickoff,
      competition: data.competition,
      round: leagueMatch?.round ?? null,
    },
    opponent: {
      name: opponent,
      standing: findStanding(data, opponent),
      recentMatches: recent.map((item) => ({
        date: item.date,
        homeTeam: item.homeTeam,
        awayTeam: item.awayTeam,
        score: item.score,
        resultForOpponent: resultForTeam(item, opponent),
      })),
      recentSummary: summary,
    },
    eendracht: {
      standing: data.standings.find((row) => isEendracht(row.team)) ?? null,
    },
    sourceNotes: [
      `Officiële ${data.source}: kalender, uitslagen en rangschikking (${data.season}).`,
      "Geen formatie, posities, wedstrijdbeelden of individuele tegenstanderspelers opgenomen tenzij die expliciet in de brondata aanwezig zijn.",
    ],
  };
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as Record<string, unknown>;
  if (typeof record.output_text === "string") return record.output_text;
  const output = Array.isArray(record.output) ? record.output : [];
  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = (part as Record<string, unknown>).text;
      if (typeof text === "string") texts.push(text);
    }
  }
  return texts.join("\n").trim();
}

function parseJsonText(text: string): AiPreviewContent {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(cleaned) as AiPreviewContent;
  if (!parsed?.title || !parsed?.intro || !Array.isArray(parsed.quickFacts)) {
    throw new Error("AI gaf geen geldige voorbeschouwing terug.");
  }
  return parsed;
}

export async function generateAiMatchPreview(facts: PreviewFacts) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ontbreekt in de serveromgeving.");
  }

  const model = process.env.OPENAI_MATCH_PREVIEW_MODEL || "gpt-5.6-luna";
  const system = `Je schrijft Nederlandstalige voetbalvoorbeschouwingen voor Collectief Wit en Zwet, supporters van Eendracht Aalst-Lede.
Gebruik ALLEEN de feiten in de aangeleverde JSON. Verzin nooit spelers, formaties, blessures, stadions, kaarten, doelpuntminuten of tactische details die niet in de input staan.
Maak duidelijk onderscheid tussen feit en voorzichtige afleiding. Gebruik woorden als 'de cijfers suggereren' wanneer iets een interpretatie is.
Schrijf energiek maar journalistiek, niet overdreven. Geen voorspelde eindscore.
Geef uitsluitend geldige JSON zonder markdown met exact deze structuur:
{
  "title": string,
  "intro": string,
  "quickFacts": [{"label": string, "value": string}],
  "patterns": [{"title": string, "text": string}],
  "recentFormSummary": string,
  "styleAnalysis": string,
  "dangers": [{"title": string, "text": string}],
  "pressurePoints": [{"title": string, "text": string}],
  "caveat": string,
  "sources": [string]
}
Richtlijnen: quickFacts 4-6 items; patterns maximaal 3; dangers 2-4; pressurePoints 2-4. Als individuele spelers niet in de feiten zitten, maak dangers teamgericht en zeg niet dat bepaalde spelers gevaarlijk zijn.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: [{ type: "input_text", text: system }] },
        {
          role: "user",
          content: [{ type: "input_text", text: JSON.stringify(facts) }],
        },
      ],
      max_output_tokens: 3200,
    }),
  });

  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      payload && typeof payload === "object"
        ? String(((payload as Record<string, unknown>).error as Record<string, unknown> | undefined)?.message ?? "")
        : "";
    throw new Error(message || `OpenAI antwoordde met status ${response.status}.`);
  }

  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI gaf geen tekst terug.");
  return { content: parseJsonText(text), model };
}
