import "server-only";

import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

const SOURCE_URL = "https://www.voetbalvlaanderen.be/club/1676/kaarten";
const CLUB_TEAMS_URLS = [
  "https://www.voetbalvlaanderen.be/club/1676/ploegen",
  "https://vv-prod2018.voetbalvlaanderen.be/club/1676/ploegen",
];
const GRAPHQL_URL = "https://datalake-prod2018.rbfa.be/graphql";
const CLUB_ID = "1676";
const TEAM_CALENDAR_HASH = "3f0441e6723b9852b4f0cff2c872f4aa674c5de2d23589efc70c7a4ffb7f6383";

export type FootballCardRecord = {
  team_key: string;
  team_label: string;
  player_name: string;
  yellow_cards: number;
  second_yellow_red: number;
  red_cards: number;
  suspension_note: string | null;
  source_url: string;
  fetched_at: string;
};

type JsonRecord = Record<string, unknown>;
type TeamRef = { id: string; label: string };
type MatchRef = { id: string; startTime: string; homeName: string; awayName: string };
type MatchCard = { playerName: string; yellow: number; secondYellow: number; red: number };

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
function asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function asString(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
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
    .replace(/&iuml;/gi, "ï")
    .replace(/&auml;/gi, "ä")
    .replace(/&uuml;/gi, "ü")
    .replace(/&ouml;/gi, "ö")
    .replace(/&agrave;/gi, "à")
    .replace(/&egrave;/gi, "è")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}
function normalizeTeamLabel(value: string) {
  const cleaned = decodeHtml(value)
    .replace(/\s+/g, " ")
    .replace(/^koninklijke\s+eendracht\s+aalst\s+lede\s*/i, "")
    .replace(/^eendracht\s+aalst[- ]lede\s*/i, "")
    .replace(/^k\.?\s*eendracht\s+aalst\s+lede\s*/i, "")
    .trim();
  if (!cleaned || /^(a|1|eerste|eerste ploeg|eerste elftal)$/i.test(cleaned)) return "Eerste elftal";
  return cleaned;
}
function teamKey(value: string) {
  return normalizeTeamLabel(value).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "eerste-elftal";
}
function dedupeTeams(teams: TeamRef[]) {
  const map = new Map<string, TeamRef>();
  for (const team of teams) if (team.id && !map.has(team.id)) map.set(team.id, team);
  return [...map.values()];
}
async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      "accept-language": "nl-BE,nl;q=0.9,en;q=0.5",
      "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Bron antwoordde met HTTP ${response.status}.`);
  return response.text();
}

/**
 * De publieke clubpagina bevat links naar /club/1676/ploeg/<teamId>.
 * De zichtbare naam kan in dezelfde <a>, een ouder-element of een JSON-payload staan.
 */
function teamsFromClubHtml(html: string): TeamRef[] {
  const teams: TeamRef[] = [];
  const escapedClub = CLUB_ID.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hrefPattern = new RegExp(`href=["']([^"']*\\/club\\/${escapedClub}\\/ploeg\\/(\\d+)(?:\\/[^"']*)?)["']`, "gi");

  for (const match of html.matchAll(hrefPattern)) {
    const id = match[2];
    const idx = match.index ?? 0;
    const around = html.slice(Math.max(0, idx - 350), Math.min(html.length, idx + 900));
    const anchor = around.match(new RegExp(`<a\\b[^>]*\\/club\\/${escapedClub}\\/ploeg\\/${id}(?:\\/[^"']*)?["'][^>]*>([\\s\\S]*?)<\\/a>`, "i"));
    let label = decodeHtml(anchor?.[1] ?? "");

    // Soms is de link zelf een knop en staat de ploegnaam vlak ervoor/erna.
    if (!label || /bekijk|meer|kalender|leden|ploeg/i.test(label)) {
      const text = decodeHtml(around);
      const age = text.match(/\b(U\s?\d{1,2}(?:\s?[A-Z])?|beloften?|reserven?|eerste(?:\s+elftal|\s+ploeg)?|dames\s?\d*|vrouwen\s?\d*)\b/i);
      if (age) label = age[1];
    }

    teams.push({ id, label: normalizeTeamLabel(label || `Ploeg ${id}`) });
  }

  // JSON/JS-fallback: teamId vlak bij een naam/category/description.
  const jsonLike = html.replace(/\\u002F/g, "/").replace(/\\\//g, "/");
  for (const m of jsonLike.matchAll(/(?:teamId|teamID|team_id)["']?\s*[:=]\s*["']?(\d{4,9})["']?[\s\S]{0,350}?(?:teamName|name|label|categoryName|description)["']?\s*[:=]\s*["']([^"']{1,90})["']/gi)) {
    teams.push({ id: m[1], label: normalizeTeamLabel(m[2]) });
  }

  return dedupeTeams(teams).filter((team) => !/^ploeg \d+$/i.test(team.label));
}

async function discoverClubTeams(): Promise<TeamRef[]> {
  const found: TeamRef[] = [];
  const diagnostics: string[] = [];
  for (const url of CLUB_TEAMS_URLS) {
    try {
      const html = await fetchText(url);
      const teams = teamsFromClubHtml(html);
      diagnostics.push(`${new URL(url).hostname}:${teams.length}`);
      found.push(...teams);
    } catch (error) {
      diagnostics.push(`${new URL(url).hostname}:fout`);
    }
  }
  const teams = dedupeTeams(found);
  if (!teams.length) {
    throw new Error(`Geen ploeg-ID's gevonden op de clubpagina (${diagnostics.join(", ")}).`);
  }
  return teams;
}

async function fetchTeamCalendar(teamId: string): Promise<MatchRef[]> {
  const operation = "GetTeamCalendar";
  const variables = { teamId: String(teamId), language: "nl", sortByDate: "asc" };
  const extensions = { persistedQuery: { version: 1, sha256Hash: TEAM_CALENDAR_HASH } };
  const params = new URLSearchParams({
    operationName: operation,
    variables: JSON.stringify(variables),
    extensions: JSON.stringify(extensions),
  });
  const response = await fetch(`${GRAPHQL_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json",
      "x-apollo-operation-name": operation,
      "apollo-require-preflight": "true",
      "user-agent": "CollectiefWitEnZwet/1.0 (+https://app.collectiefwitenzwet.be)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Kalender ploeg ${teamId}: HTTP ${response.status}.`);
  const json = await response.json() as JsonRecord;
  const data = asRecord(json.data);
  const items = asArray(data?.teamCalendar).map(asRecord).filter(Boolean) as JsonRecord[];
  const matches: MatchRef[] = [];
  for (const item of items) {
    const id = asString(item.id);
    const startTime = asString(item.startTime);
    const home = asRecord(item.homeTeam);
    const away = asRecord(item.awayTeam);
    const homeName = asString(home?.name);
    const awayName = asString(away?.name);
    if (!id || !homeName || !awayName) continue;
    matches.push({ id, startTime, homeName, awayName });
  }
  return matches;
}

function recursiveObjects(value: unknown, output: JsonRecord[] = []): JsonRecord[] {
  if (Array.isArray(value)) { value.forEach((item) => recursiveObjects(item, output)); return output; }
  const record = asRecord(value); if (!record) return output;
  output.push(record); Object.values(record).forEach((item) => recursiveObjects(item, output)); return output;
}
function findEmbeddedJson(html: string): unknown[] {
  const payloads: unknown[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { payloads.push(JSON.parse(match[1])); } catch { /* ignore */ }
  }
  const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next) { try { payloads.push(JSON.parse(next[1])); } catch { /* ignore */ } }
  return payloads;
}
function firstString(record: JsonRecord | null, keys: string[]) {
  if (!record) return "";
  for (const key of keys) { const value = asString(record[key]); if (value) return value; }
  return "";
}
function eventKind(obj: JsonRecord): "yellow" | "second" | "red" | null {
  const blob = [
    firstString(obj, ["type", "eventType", "event", "kind", "name", "description", "label", "cardType", "sanctionType"]),
    ...Object.keys(obj),
  ].join(" ").toLowerCase();
  if (/second.?yellow|2(?:nd|e)?.?yellow|yellow.?red|double.?yellow|tweede.?geel|geel.?rood/.test(blob)) return "second";
  if (/red.?card|card.?red|rode.?kaart|direct.?red|straight.?red/.test(blob)) return "red";
  if (/yellow.?card|card.?yellow|gele.?kaart|booking/.test(blob)) return "yellow";
  return null;
}
function playerNameFromEvent(obj: JsonRecord) {
  const nested = asRecord(obj.player) ?? asRecord(obj.person) ?? asRecord(obj.member) ?? asRecord(obj.athlete);
  return firstString(obj, ["playerName", "personName", "memberName", "fullName", "displayName"]) ||
    firstString(nested, ["fullName", "displayName", "name"]);
}
function cardsFromEmbeddedJson(html: string): MatchCard[] {
  const cards: MatchCard[] = [];
  for (const payload of findEmbeddedJson(html)) {
    for (const obj of recursiveObjects(payload)) {
      const kind = eventKind(obj); if (!kind) continue;
      const playerName = playerNameFromEvent(obj); if (!playerName) continue;
      cards.push({ playerName, yellow: kind === "yellow" ? 1 : 0, secondYellow: kind === "second" ? 1 : 0, red: kind === "red" ? 1 : 0 });
    }
  }
  return cards;
}

function cardsFromHtml(html: string): MatchCard[] {
  const cards: MatchCard[] = [];
  // Zoek kaart-indicatoren in een beperkt HTML-venster en haal daar de meest waarschijnlijke spelersnaam uit.
  const indicators = /(?:yellow[-_ ]?card|red[-_ ]?card|gele[-_ ]?kaart|rode[-_ ]?kaart|second[-_ ]?yellow|yellow[-_ ]?red|tweede[-_ ]?geel|geel[-_ ]?rood|booking)/gi;
  for (const match of html.matchAll(indicators)) {
    const idx = match.index ?? 0;
    const context = html.slice(Math.max(0, idx - 900), Math.min(html.length, idx + 900));
    const plain = decodeHtml(context);
    const marker = match[0].toLowerCase();
    const kind: "yellow" | "second" | "red" = /second|yellow.?red|tweede|geel.?rood/.test(marker)
      ? "second" : /red|rode/.test(marker) ? "red" : "yellow";

    // Namen op wedstrijdbladen zijn doorgaans 2-5 woorden met hoofdletters; sluit UI-labels uit.
    const candidates = [...plain.matchAll(/\b([A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+(?:van|de|der|den|des|het|ten|ter|Van|De|Der|Den|Des|Het|Ten|Ter))?\s+[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+(?:\s+[A-ZÀ-ÖØ-Ý][A-Za-zÀ-ÖØ-öø-ÿ'’.-]+){0,2})\b/g)]
      .map((m) => m[1])
      .filter((name) => !/Voetbal Vlaanderen|Eendracht Aalst|Koninklijke Eendracht|Gele Kaart|Rode Kaart|Wedstrijd|Scheidsrechter|Aftrap|Einde Van/i.test(name));
    const playerName = candidates.at(-1);
    if (playerName) cards.push({ playerName, yellow: kind === "yellow" ? 1 : 0, secondYellow: kind === "second" ? 1 : 0, red: kind === "red" ? 1 : 0 });
  }
  return cards;
}

function dedupeMatchCards(cards: MatchCard[]) {
  // Eenzelfde event kan via embedded JSON én HTML gevonden worden. Per soort/speler tellen we de hoogste detectie,
  // maar meerdere verschillende kaartgebeurtenissen van dezelfde soort in één match blijven mogelijk via JSON.
  const map = new Map<string, MatchCard>();
  for (const c of cards) {
    const key = c.playerName.toLowerCase();
    const prev = map.get(key) ?? { playerName: c.playerName, yellow: 0, secondYellow: 0, red: 0 };
    prev.yellow = Math.max(prev.yellow, c.yellow);
    prev.secondYellow = Math.max(prev.secondYellow, c.secondYellow);
    prev.red = Math.max(prev.red, c.red);
    map.set(key, prev);
  }
  return [...map.values()];
}

async function fetchMatchCards(matchId: string): Promise<MatchCard[]> {
  const urls = [
    `https://vv-prod2018.voetbalvlaanderen.be/wedstrijd/${matchId}`,
    `https://www.voetbalvlaanderen.be/wedstrijd/${matchId}`,
  ];
  for (const url of urls) {
    try {
      const html = await fetchText(url);
      const embedded = cardsFromEmbeddedJson(html);
      const visible = cardsFromHtml(html);
      const cards = dedupeMatchCards([...embedded, ...visible]);
      if (cards.length) return cards;
    } catch { /* probeer volgende host */ }
  }
  return [];
}

function isPlayed(match: MatchRef) {
  if (!match.startTime) return true;
  const time = Date.parse(match.startTime);
  return Number.isNaN(time) || time < Date.now() + 6 * 60 * 60 * 1000;
}

export async function fetchFootballCardsFromSource() {
  const fetchedAt = new Date().toISOString();
  const teams = await discoverClubTeams();
  const records = new Map<string, FootballCardRecord>();
  const diagnostics = { teams: teams.length, calendars: 0, matches: 0, matchesWithCards: 0 };

  // Beperk gelijktijdigheid bewust: we willen de publieke bron niet bestoken.
  for (const team of teams) {
    let matches: MatchRef[] = [];
    try {
      matches = (await fetchTeamCalendar(team.id)).filter(isPlayed);
      diagnostics.calendars += 1;
    } catch {
      continue;
    }

    // Alleen het lopende seizoen; kalenders kunnen oudere items bevatten.
    const seasonMatches = matches.filter((match) => {
      const t = Date.parse(match.startTime);
      if (Number.isNaN(t)) return true;
      const d = new Date(t);
      return d >= new Date("2026-07-01T00:00:00Z") && d <= new Date("2027-06-30T23:59:59Z");
    });

    for (const match of seasonMatches) {
      diagnostics.matches += 1;
      const cards = await fetchMatchCards(match.id);
      if (cards.length) diagnostics.matchesWithCards += 1;
      for (const card of cards) {
        const label = normalizeTeamLabel(team.label);
        const key = `${team.id}|${card.playerName.toLowerCase()}`;
        const prev = records.get(key) ?? {
          team_key: teamKey(label), team_label: label, player_name: card.playerName,
          yellow_cards: 0, second_yellow_red: 0, red_cards: 0,
          suspension_note: null, source_url: SOURCE_URL, fetched_at: fetchedAt,
        };
        prev.yellow_cards += card.yellow;
        prev.second_yellow_red += card.secondYellow;
        prev.red_cards += card.red;
        records.set(key, prev);
      }
    }
  }

  const result = [...records.values()].sort((a, b) =>
    a.team_label.localeCompare(b.team_label, "nl") || b.red_cards - a.red_cards ||
    b.second_yellow_red - a.second_yellow_red || b.yellow_cards - a.yellow_cards ||
    a.player_name.localeCompare(b.player_name, "nl")
  );

  if (!result.length) {
    throw new Error(
      `Ploegen gevonden (${diagnostics.teams}) en kalenders geladen (${diagnostics.calendars}), maar op ${diagnostics.matches} gespeelde wedstrijdbladen werden geen kaartgebeurtenissen betrouwbaar herkend. De vorige snapshot blijft behouden.`
    );
  }

  return result;
}

export async function syncFootballCards() {
  const supabase = getSupabaseAdmin();
  const records = await fetchFootballCardsFromSource();
  const fetchedAt = records[0]?.fetched_at ?? new Date().toISOString();

  const { error: upsertError } = await supabase.from("football_card_records").upsert(records, { onConflict: "team_key,player_name" });
  if (upsertError) throw new Error(`Kaarten opslaan mislukt: ${upsertError.message}`);

  const activeKeys = records.map((record) => `${record.team_key}|||${record.player_name}`);
  const { data: existing } = await supabase.from("football_card_records").select("id, team_key, player_name");
  const staleIds = (existing ?? []).filter((row: { id: string; team_key: string; player_name: string }) => !activeKeys.includes(`${row.team_key}|||${row.player_name}`)).map((row: { id: string; team_key: string; player_name: string }) => row.id);
  if (staleIds.length) await supabase.from("football_card_records").delete().in("id", staleIds);

  await supabase.from("football_card_sync_state").upsert({
    id: 1, club_id: CLUB_ID, source_url: SOURCE_URL, last_sync_at: fetchedAt,
    last_success_at: fetchedAt, last_error: null, records_count: records.length,
  }, { onConflict: "id" });
  return { records, fetchedAt };
}

export async function rememberFootballCardsError(error: unknown) {
  const supabase = getSupabaseAdmin();
  const message = error instanceof Error ? error.message : "Onbekende fout.";
  await supabase.from("football_card_sync_state").upsert({
    id: 1, club_id: CLUB_ID, source_url: SOURCE_URL,
    last_sync_at: new Date().toISOString(), last_error: message,
  }, { onConflict: "id" });
}

export async function getCachedFootballCards() {
  const supabase = getSupabaseAdmin();
  const [{ data: records, error }, { data: state }] = await Promise.all([
    supabase.from("football_card_records").select("*").order("team_label").order("yellow_cards", { ascending: false }),
    supabase.from("football_card_sync_state").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (error) throw new Error(`Kaarten laden mislukt: ${error.message}`);
  return { records: records ?? [], state: state ?? null, sourceUrl: SOURCE_URL };
}
