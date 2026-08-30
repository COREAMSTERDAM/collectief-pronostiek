import "server-only";

const SOURCE_URL =
  "https://www.voetbalexpress.be/seizoen2026-2027/herenamateurs2a.html";

export type VvaMatch = {
  round: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  score: string | null;
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
  season: string;
  competition: string;
  matches: VvaMatch[];
  standings: VvaStanding[];
  fetchedAt: string;
};

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
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
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

function parseMatches(rows: string[][]): VvaMatch[] {
  const matchRows: Array<Omit<VvaMatch, "round">> = [];

  for (const cells of rows) {
    // Typical Voetbalexpress row:
    // Zon. | 30/08 | 15u00 | Eendracht Aalst Lede | - | VK Ninove A
    if (cells.length < 6) continue;

    const dateIndex = cells.findIndex((cell) => /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(cell));
    if (dateIndex < 0 || cells.length < dateIndex + 5) continue;

    const time = cells[dateIndex + 1] ?? "";
    const homeTeam = normalizeTeam(cells[dateIndex + 2] ?? "");
    const resultCell = (cells[dateIndex + 3] ?? "").replace(/\s+/g, " ").trim();
    const awayTeam = normalizeTeam(cells[dateIndex + 4] ?? "");

    if (!/^\d{1,2}u\d{2}$/.test(time)) continue;
    if (!homeTeam || !awayTeam) continue;

    const [dayText, monthText, explicitYear] = cells[dateIndex].split("/");
    const month = Number(monthText);
    const year = explicitYear
      ? Number(explicitYear.length === 2 ? `20${explicitYear}` : explicitYear)
      : month >= 7
        ? 2026
        : 2027;

    const date = `${year}-${String(month).padStart(2, "0")}-${String(Number(dayText)).padStart(2, "0")}`;
    const score = /^\d+\s*[-–]\s*\d+$/.test(resultCell)
      ? resultCell.replace(/\s*[–-]\s*/, "-")
      : null;

    matchRows.push({ date, time, homeTeam, awayTeam, score });
  }

  // Keep only the competition schedule block: 30 matchdays x 8 games.
  // The page can contain repeated per-team calendars after the main schedule.
  const unique: Array<Omit<VvaMatch, "round">> = [];
  const seen = new Set<string>();
  for (const match of matchRows) {
    const key = `${match.date}|${match.homeTeam.toLowerCase()}|${match.awayTeam.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(match);
    if (unique.length >= 240) break;
  }

  return unique.map((match, index) => ({
    ...match,
    round: Math.floor(index / 8) + 1,
  }));
}

function parseStandings(rows: string[][]): VvaStanding[] {
  const candidates: VvaStanding[] = [];

  for (const cells of rows) {
    if (cells.length < 9) continue;
    if (!/^\d{1,2}$/.test(cells[0])) continue;
    if (!cells.slice(2, 9).every((cell) => /^-?\d+$/.test(cell))) continue;

    const position = Number(cells[0]);
    if (position < 1 || position > 16) continue;

    candidates.push({
      position,
      team: normalizeTeam(cells[1]),
      played: Number(cells[2]),
      wins: Number(cells[3]),
      losses: Number(cells[4]),
      draws: Number(cells[5]),
      goalsFor: Number(cells[6]),
      goalsAgainst: Number(cells[7]),
      points: Number(cells[8]),
    });
  }

  // The first full 1..16 table on the page is the general ranking.
  for (let start = 0; start <= candidates.length - 16; start += 1) {
    const block = candidates.slice(start, start + 16);
    if (block.every((row, index) => row.position === index + 1)) {
      return block;
    }
  }

  return [];
}

export async function fetchVvaClubData(): Promise<VvaClubData> {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)",
      accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Competitiedata ophalen mislukt (${response.status}).`);
  }

  const html = await response.text();
  const rows = rowsFromHtml(html);
  const matches = parseMatches(rows);
  const standings = parseStandings(rows);

  if (matches.length < 8) {
    throw new Error("De kalender kon niet betrouwbaar uit de bron worden gelezen.");
  }

  return {
    source: SOURCE_URL,
    season: "2026-2027",
    competition: "2e Afdeling VV A",
    matches,
    standings,
    fetchedAt: new Date().toISOString(),
  };
}
