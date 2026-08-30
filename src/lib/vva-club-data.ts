import "server-only";

const SOURCE_URL =
  "https://www.voetbalexpress.be/seizoen2026-2027/herenamateurs2a.html";
const RESULTS_FALLBACK_URL =
  "https://footballinfo.net/Leagues/Details/149?season=2026";

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

function normalizeKeyTeam(value: string) {
  return normalizeTeam(value)
    .toLowerCase()
    .replace(/^koninklijke\s+/i, "")
    .replace(/\b(k\.?)?s\.?(v\.?)?\b/gi, "")
    .replace(/\bk\.?(v|f|m|s|r|fc|sk)\.?\b/gi, "")
    .replace(/\bfc\b|\bsk\b/gi, "")
    .replace(/\s+a$/i, "")
    .replace(/\s+ii$/i, " b")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: string) {
  const parts = value.split("/").map(Number);
  if (parts.length < 2) return null;
  const [day, month, explicitYear] = parts;
  const year = explicitYear || (month >= 7 ? 2026 : 2027);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function scoreValue(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return /^\d+\s*[-–]\s*\d+$/.test(clean)
    ? clean.replace(/\s*[–-]\s*/, "-")
    : null;
}

function parseMatches(rows: string[][]): VvaMatch[] {
  const detailed = new Map<string, { time: string; score: string | null }>();

  // Bovenaan staat de actuele speeldag met datum + uur.
  for (const cells of rows) {
    if (cells.length < 6) continue;
    const dateIndex = cells.findIndex((cell) => /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(cell));
    if (dateIndex < 0 || cells.length < dateIndex + 5) continue;

    const time = cells[dateIndex + 1] ?? "";
    if (!/^\d{1,2}u\d{2}$/.test(time)) continue;

    const date = parseDate(cells[dateIndex]);
    const homeTeam = normalizeTeam(cells[dateIndex + 2] ?? "");
    const awayTeam = normalizeTeam(cells[dateIndex + 4] ?? "");
    if (!date || !homeTeam || !awayTeam) continue;

    const key = `${date}|${normalizeKeyTeam(homeTeam)}|${normalizeKeyTeam(awayTeam)}`;
    detailed.set(key, {
      time,
      score: scoreValue(cells[dateIndex + 3] ?? ""),
    });
  }

  // De volledige kalender staat verder op de pagina in de vorm:
  // 30/08/2026 | 1 | thuis | - / score | uit | Speeldag
  const full: VvaMatch[] = [];
  const seen = new Set<string>();

  for (const cells of rows) {
    if (cells.length < 5) continue;
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cells[0] ?? "")) continue;
    if (!/^\d{1,2}$/.test(cells[1] ?? "")) continue;

    const round = Number(cells[1]);
    if (round < 1 || round > 30) continue;

    const date = parseDate(cells[0]);
    const homeTeam = normalizeTeam(cells[2] ?? "");
    const awayTeam = normalizeTeam(cells[4] ?? "");
    if (!date || !homeTeam || !awayTeam) continue;

    const uniqueKey = `${round}|${normalizeKeyTeam(homeTeam)}|${normalizeKeyTeam(awayTeam)}`;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);

    const detailedKey = `${date}|${normalizeKeyTeam(homeTeam)}|${normalizeKeyTeam(awayTeam)}`;
    const detail = detailed.get(detailedKey);

    full.push({
      round,
      date,
      time: detail?.time ?? "",
      homeTeam,
      awayTeam,
      score: scoreValue(cells[3] ?? "") ?? detail?.score ?? null,
    });
  }

  full.sort((a, b) => a.round - b.round || a.date.localeCompare(b.date) || a.homeTeam.localeCompare(b.homeTeam));
  return full;
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

  for (let start = 0; start <= candidates.length - 16; start += 1) {
    const block = candidates.slice(start, start + 16);
    if (block.every((row, index) => row.position === index + 1)) return block;
  }

  return [];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FOOTBALLINFO_ALIASES: Record<string, string[]> = {
  "racing club gent": ["KRC Gent", "Racing Club Gent"],
  "voorde appelterre": ["Voorde Appelterre", "KFC Voorde Appelterre"],
  "sp petegem deinze": ["Sparta Petegem", "Sp Petegem", "Petegem"],
  "zulte waregem b": ["Zulte Waregem II", "Zulte-Waregem II", "Zulte Waregem B"],
  "lebbeke": ["FC Lebbeke"],
  "oostkamp": ["Oostkamp", "KSV Oostkamp"],
  "londerzeel": ["Londerzeel", "KSK Londerzeel"],
  "mechelen b": ["Mechelen II", "KV Mechelen B"],
  "ho kalken": ["HO Kalken", "KFC HO Kalken"],
  "oudenaarde": ["Oudenaarde", "KSV Oudenaarde"],
  "rfc wetteren": ["RFC Wetteren", "Wetteren"],
  "vw hamme": ["VW Hamme", "KFC VW Hamme"],
  "eendracht aalst lede": ["Eendracht Aalst", "Eendracht Aalst Lede"],
  "vk ninove": ["Ninove", "VK Ninove"],
  "torhout": ["Torhout", "KM Torhout"],
  "diksmuide oostende": ["Diksmuide", "KV Diksmuide Oostende"],
};

function aliasesForTeam(team: string) {
  const key = normalizeKeyTeam(team);
  const aliases = FOOTBALLINFO_ALIASES[key] ?? [];
  return Array.from(new Set([normalizeTeam(team), ...aliases]));
}

/**
 * FootballInfo rendert de fixture/resultaat-lijst niet als klassieke tabel.
 * De zichtbare tekst bevat regels in de vorm:
 *   29 Aug FC Lebbeke 1 – 2 Oostkamp FT
 * Daarom zoeken we per gekende kalenderwedstrijd rechtstreeks in de
 * platte paginatekst. De kalender zelf blijft van Voetbalexpress komen.
 */
function mergeFootballInfoResults(matches: VvaMatch[], html: string) {
  const pageText = decodeHtml(html)
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  if (!pageText) return matches;

  return matches.map((match) => {
    if (match.score) return match;

    const homeAliases = aliasesForTeam(match.homeTeam);
    const awayAliases = aliasesForTeam(match.awayTeam);

    for (const home of homeAliases) {
      for (const away of awayAliases) {
        const homePattern = escapeRegExp(home).replace(/\\ /g, "\\s+");
        const awayPattern = escapeRegExp(away).replace(/\\ /g, "\\s+");

        // FT is essentieel: zo nemen we geen prognoses, H2H-scores of
        // andere cijfers op dezelfde pagina als wedstrijduitslag over.
        const patterns = [
          new RegExp(`${homePattern}\\s+(\\d{1,2})\\s*-\\s*(\\d{1,2})\\s+${awayPattern}\\s+FT`, "i"),
          new RegExp(`${homePattern}\\s+(\\d{1,2})\\s+(?:–|—|-)\\s*(\\d{1,2})\\s+${awayPattern}\\s+FT`, "i"),
        ];

        for (const pattern of patterns) {
          const found = pageText.match(pattern);
          if (found) {
            return { ...match, score: `${Number(found[1])}-${Number(found[2])}` };
          }
        }
      }
    }

    return match;
  });
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
  let matches = parseMatches(rows);
  const standings = parseStandings(rows);

  // Voetbalexpress loopt soms achter met uitslagen. Probeer dan een tweede
  // publieke bron uitsluitend als score-fallback; kalender/klassement blijven
  // volledig van Voetbalexpress komen.
  try {
    const fallback = await fetch(RESULTS_FALLBACK_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 900 },
    });
    if (fallback.ok) {
      matches = mergeFootballInfoResults(matches, await fallback.text());
    }
  } catch {
    // Geen probleem: de primaire bron blijft bruikbaar.
  }

  if (matches.length < 200) {
    throw new Error("De volledige kalender kon niet betrouwbaar uit de bron worden gelezen.");
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
