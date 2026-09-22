import "server-only";

import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

const SOURCE_URL = "https://www.voetbalvlaanderen.be/club/1676/kaarten";
const CLUB_TEAMS_URL = "https://www.voetbalvlaanderen.be/club/1676/ploegen";
const GRAPHQL_URL = "https://datalake-prod2018.rbfa.be/graphql";
const CLUB_ID = "1676";

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
type PersistedCandidate = { operation: string; hash: string; score: number };
type DiscoveryDiagnostics = { assetCount: number; candidates: string[]; graphqlErrors: string[] };

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function firstString(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = asString(record[key]);
    if (value) return value;
  }
  return "";
}

function firstNumber(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) return value;
  }
  return 0;
}

function normalizeTeamLabel(value: string) {
  const cleaned = value
    .replace(/\s+/g, " ")
    .replace(/^koninklijke\s+eendracht\s+aalst\s+lede\s*/i, "")
    .replace(/^eendracht\s+aalst[- ]lede\s*/i, "")
    .replace(/^k\.?\s*eendracht\s+aalst\s+lede\s*/i, "")
    .trim();

  if (!cleaned || /^(a|1|eerste|eerste ploeg|eerste elftal)$/i.test(cleaned)) return "Eerste elftal";
  return cleaned;
}

function teamKey(value: string) {
  return normalizeTeamLabel(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "eerste-elftal";
}

function decodeHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function recursiveObjects(value: unknown, output: JsonRecord[] = []): JsonRecord[] {
  if (Array.isArray(value)) {
    value.forEach((item) => recursiveObjects(item, output));
    return output;
  }
  const record = asRecord(value);
  if (!record) return output;
  output.push(record);
  Object.values(record).forEach((item) => recursiveObjects(item, output));
  return output;
}

function cardCount(record: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const number = asNumber(record[key]);
    if (number !== null) return number;
    const nested = asRecord(record[key]);
    if (nested) {
      const nestedCount = firstNumber(nested, ["count", "total", "amount", "value"]);
      if (nestedCount) return nestedCount;
    }
  }
  return 0;
}

function recordFromObject(obj: JsonRecord, fetchedAt: string): FootballCardRecord | null {
  const player = asRecord(obj.player) ?? asRecord(obj.person) ?? asRecord(obj.member) ?? asRecord(obj.athlete);
  const playerName = firstString(obj, ["playerName", "fullName", "displayName", "memberName", "personName"]) ||
    (player ? firstString(player, ["fullName", "displayName", "name", "memberName"]) : "");

  // Een generiek `name`-veld gebruiken we alleen wanneer dit object duidelijk kaartvelden bevat.
  const hasCardKey = Object.keys(obj).some((key) => /yellow|red|card|sanction|suspens/i.test(key));
  const safePlayerName = playerName || (hasCardKey ? firstString(obj, ["name"]) : "");

  const yellow = cardCount(obj, [
    "yellowCards", "yellowCard", "yellow", "cardsYellow", "yellowCount",
    "numberOfYellowCards", "yellowCardsCount", "yellowCardCount",
  ]);
  const secondYellow = cardCount(obj, [
    "secondYellowRed", "secondYellow", "yellowRedCards", "doubleYellowRed",
    "secondYellowCards", "yellowRed", "yellowRedCount",
  ]);
  const red = cardCount(obj, [
    "redCards", "redCard", "red", "cardsRed", "redCount",
    "numberOfRedCards", "redCardsCount", "redCardCount",
  ]);

  if (!safePlayerName || (yellow === 0 && secondYellow === 0 && red === 0)) return null;
  if (/eendracht|aalst|lede|eerste elftal|u\d{1,2}|reserve|beloft/i.test(safePlayerName) && safePlayerName.split(" ").length < 4) return null;

  const team = asRecord(obj.team) ?? asRecord(obj.squad) ?? asRecord(obj.clubTeam) ?? asRecord(obj.teamInfo);
  const rawTeam = firstString(obj, ["teamName", "teamLabel", "squadName", "categoryName", "teamDescription"]) ||
    (team ? firstString(team, ["displayName", "name", "label", "categoryName", "description"]) : "") ||
    "Eerste elftal";
  const label = normalizeTeamLabel(rawTeam);

  return {
    team_key: teamKey(label),
    team_label: label,
    player_name: safePlayerName,
    yellow_cards: yellow,
    second_yellow_red: secondYellow,
    red_cards: red,
    suspension_note: firstString(obj, ["suspension", "suspensionNote", "sanction", "sanctionText", "status"]) || null,
    source_url: SOURCE_URL,
    fetched_at: fetchedAt,
  };
}

function parseTables(html: string, fetchedAt: string) {
  const results: FootballCardRecord[] = [];
  const tables = [...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];

  for (const table of tables) {
    const rows = [...table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
      .map((row) => [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decodeHtml(cell[1])))
      .filter((row) => row.length >= 2);
    if (!rows.length) continue;

    const header = rows[0].map((cell) => cell.toLowerCase());
    const playerIndex = header.findIndex((cell) => /speler|naam/.test(cell));
    const yellowIndex = header.findIndex((cell) => /geel/.test(cell) && !/rood/.test(cell));
    const yellowRedIndex = header.findIndex((cell) => /2.*geel|geel.*rood/.test(cell));
    const redIndex = header.findIndex((cell) => /rood/.test(cell) && !/geel/.test(cell));
    const teamIndex = header.findIndex((cell) => /ploeg|team|categorie/.test(cell));
    if (playerIndex < 0 || (yellowIndex < 0 && redIndex < 0 && yellowRedIndex < 0)) continue;

    for (const row of rows.slice(1)) {
      const playerName = row[playerIndex]?.trim();
      if (!playerName) continue;
      const label = normalizeTeamLabel(teamIndex >= 0 ? row[teamIndex] ?? "" : "Eerste elftal");
      const parse = (index: number) => index >= 0 ? Number((row[index] ?? "").match(/\d+/)?.[0] ?? 0) : 0;
      const yellow = parse(yellowIndex);
      const secondYellow = parse(yellowRedIndex);
      const red = parse(redIndex);
      if (yellow === 0 && secondYellow === 0 && red === 0) continue;
      results.push({
        team_key: teamKey(label), team_label: label, player_name: playerName,
        yellow_cards: yellow, second_yellow_red: secondYellow, red_cards: red,
        suspension_note: null, source_url: SOURCE_URL, fetched_at: fetchedAt,
      });
    }
  }
  return results;
}

function findEmbeddedJson(html: string): unknown[] {
  const payloads: unknown[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { payloads.push(JSON.parse(match[1])); } catch { /* ignore */ }
  }
  const next = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next) {
    try { payloads.push(JSON.parse(next[1])); } catch { /* ignore */ }
  }
  return payloads;
}

function dedupe(records: FootballCardRecord[]) {
  const map = new Map<string, FootballCardRecord>();
  for (const record of records) {
    const key = `${record.team_key}|${record.player_name.toLowerCase()}`;
    const previous = map.get(key);
    if (!previous || (record.yellow_cards + record.second_yellow_red + record.red_cards) >
      (previous.yellow_cards + previous.second_yellow_red + previous.red_cards)) {
      map.set(key, record);
    }
  }
  return [...map.values()].sort((a, b) =>
    a.team_label.localeCompare(b.team_label, "nl") ||
    b.red_cards - a.red_cards || b.second_yellow_red - a.second_yellow_red ||
    b.yellow_cards - a.yellow_cards || a.player_name.localeCompare(b.player_name, "nl")
  );
}

function absoluteUrl(src: string, base: string) {
  try { return new URL(src, base).toString(); } catch { return ""; }
}

function assetUrls(html: string, base: string) {
  const urls = new Set<string>();
  const add = (raw: string) => {
    const url = absoluteUrl(raw, base);
    if (url && /\.m?js(?:\?|$)/i.test(url)) urls.add(url);
  };

  for (const match of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of html.matchAll(/["']([^"']+\.m?js(?:\?[^"']*)?)["']/gi)) add(match[1]);

  return [...urls];
}

function persistedCandidates(js: string): PersistedCandidate[] {
  const found = new Map<string, PersistedCandidate>();
  const hashes = [...js.matchAll(/[a-f0-9]{64}/gi)];
  const ops = [...js.matchAll(/(?:operationName\s*[:=]\s*["']|query\s+)([A-Za-z0-9_]+)/g)]
    .map((match) => ({ operation: match[1], index: match.index ?? 0 }));

  for (const hashMatch of hashes) {
    const hash = hashMatch[0].toLowerCase();
    const index = hashMatch.index ?? 0;
    const nearby = js.slice(Math.max(0, index - 12000), Math.min(js.length, index + 12000));
    const nearbyOps = ops
      .filter((item) => Math.abs(item.index - index) <= 12000)
      .sort((a, b) => Math.abs(a.index - index) - Math.abs(b.index - index))
      .slice(0, 12);

    for (const { operation } of nearbyOps) {
      let score = 0;
      if (/card|yellow|red|sanction|suspens|disciplin|penalt/i.test(operation)) score += 20;
      if (/club|team|member|player|person|squad/i.test(operation)) score += 5;
      if (/card|yellow|red|sanction|suspens|disciplin|penalt/i.test(nearby)) score += 8;
      if (/clubId|teamId|organizationId|season/i.test(nearby)) score += 3;
      const distance = Math.abs((nearbyOps.find((x) => x.operation === operation)?.index ?? index) - index);
      if (distance < 800) score += 6;
      else if (distance < 2500) score += 3;
      if (score < 6) continue;
      const key = `${operation}|${hash}`;
      const previous = found.get(key);
      if (!previous || previous.score < score) found.set(key, { operation, hash, score });
    }
  }

  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, 80);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/javascript,text/javascript,*/*;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} antwoordde met ${response.status}.`);
  return response.text();
}

async function callPersisted(candidate: PersistedCandidate, variables: JsonRecord) {
  const params = new URLSearchParams({
    operationName: candidate.operation,
    variables: JSON.stringify({ ...variables, language: "nl" }),
    extensions: JSON.stringify({ persistedQuery: { version: 1, sha256Hash: candidate.hash } }),
  });
  const response = await fetch(`${GRAPHQL_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json",
      "x-apollo-operation-name": candidate.operation,
      "apollo-require-preflight": "true",
      "user-agent": "CollectiefWitEnZwet/1.0 (+https://app.collectiefwitenzwet.be)",
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => null);
  const record = asRecord(json);
  const errors = asArray(record?.errors)
    .map((item) => firstString(asRecord(item) ?? {}, ["message"]))
    .filter(Boolean);

  if (!response.ok) {
    return { payload: null as JsonRecord | null, error: `${candidate.operation}: HTTP ${response.status}${errors[0] ? ` · ${errors[0]}` : ""}` };
  }
  if (!record || !asRecord(record.data)) {
    return { payload: null as JsonRecord | null, error: `${candidate.operation}: ${errors[0] || "geen data"}` };
  }
  return { payload: record, error: errors[0] ? `${candidate.operation}: ${errors[0]}` : null };
}

function recordsFromPayload(payload: unknown, fetchedAt: string) {
  const records: FootballCardRecord[] = [];
  for (const obj of recursiveObjects(payload)) {
    const record = recordFromObject(obj, fetchedAt);
    if (record) records.push(record);
  }
  return dedupe(records);
}

async function fetchFromDiscoveredGraphql(html: string, fetchedAt: string, baseUrl = SOURCE_URL) {
  const urls = assetUrls(html, baseUrl).slice(0, 120);
  const candidates: PersistedCandidate[] = [];
  const graphqlErrors: string[] = [];

  for (const url of urls) {
    try {
      const js = await fetchText(url);
      candidates.push(...persistedCandidates(js));
    } catch {
      // Een optionele asset mag de volledige sync niet doen falen.
    }
  }

  const unique = new Map<string, PersistedCandidate>();
  for (const candidate of candidates) unique.set(`${candidate.operation}|${candidate.hash}`, candidate);
  const ordered = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 60);

  const variableSets: JsonRecord[] = [
    { clubId: CLUB_ID }, { clubId: Number(CLUB_ID) },
    { clubID: CLUB_ID }, { clubID: Number(CLUB_ID) },
    { club: CLUB_ID }, { club: Number(CLUB_ID) },
    { id: CLUB_ID }, { id: Number(CLUB_ID) },
    { organizationId: CLUB_ID }, { organizationId: Number(CLUB_ID) },
    { organisationId: CLUB_ID }, { organisationId: Number(CLUB_ID) },
  ];

  for (const candidate of ordered) {
    for (const variables of variableSets) {
      try {
        const result = await callPersisted(candidate, variables);
        if (result.error && graphqlErrors.length < 12) graphqlErrors.push(result.error);
        if (!result.payload) continue;
        const records = recordsFromPayload(result.payload, fetchedAt);
        if (records.length) {
          return {
            records,
            operation: candidate.operation,
            diagnostics: { assetCount: urls.length, candidates: ordered.map((x) => x.operation).slice(0, 12), graphqlErrors },
          };
        }
      } catch (error) {
        if (graphqlErrors.length < 12) graphqlErrors.push(error instanceof Error ? error.message : "GraphQL-fout");
      }
    }
  }

  return {
    records: [] as FootballCardRecord[],
    operation: null as string | null,
    diagnostics: { assetCount: urls.length, candidates: ordered.map((x) => x.operation).slice(0, 12), graphqlErrors },
  };
}

export async function fetchFootballCardsFromSource() {
  const html = await fetchText(SOURCE_URL);
  const fetchedAt = new Date().toISOString();

  // 1. Eerst eventueel server-gerenderde/embedded data proberen.
  const records = parseTables(html, fetchedAt);
  for (const payload of findEmbeddedJson(html)) records.push(...recordsFromPayload(payload, fetchedAt));
  const direct = dedupe(records);
  if (direct.length) return direct;

  // 2. De huidige frontendassets laten vertellen welke persisted GraphQL-query actief is.
  const graphql = await fetchFromDiscoveredGraphql(html, fetchedAt, SOURCE_URL);
  if (graphql.records.length) return graphql.records;

  // 3. Soms staat de ploegpagina op een andere assetgroep. Die ook inspecteren.
  let teamsDiagnostics: DiscoveryDiagnostics | null = null;
  try {
    const teamsHtml = await fetchText(CLUB_TEAMS_URL);
    const fromTeamsBundle = await fetchFromDiscoveredGraphql(teamsHtml, fetchedAt, CLUB_TEAMS_URL);
    teamsDiagnostics = fromTeamsBundle.diagnostics;
    if (fromTeamsBundle.records.length) return fromTeamsBundle.records;
  } catch {
    // De diagnose van de kaartenpagina blijft beschikbaar.
  }

  const diagnostics = [graphql.diagnostics, teamsDiagnostics].filter(Boolean) as DiscoveryDiagnostics[];
  const assets = diagnostics.reduce((sum, item) => sum + item.assetCount, 0);
  const candidates = [...new Set(diagnostics.flatMap((item) => item.candidates))].slice(0, 8);
  const gqlErrors = [...new Set(diagnostics.flatMap((item) => item.graphqlErrors))].slice(0, 4);
  const detail = [
    `assets=${assets}`,
    candidates.length ? `queries=${candidates.join(", ")}` : "queries=geen",
    gqlErrors.length ? `GraphQL=${gqlErrors.join(" | ")}` : "GraphQL=geen bruikbare response",
  ].join(" · ");

  throw new Error(
    `Voetbal Vlaanderen werd bereikt, maar de kaarten-data kon nog niet betrouwbaar worden uitgelezen. ${detail}. De vorige snapshot blijft behouden.`,
  );
}

export async function syncFootballCards() {
  const supabase = getSupabaseAdmin();
  const records = await fetchFootballCardsFromSource();
  const fetchedAt = records[0]?.fetched_at ?? new Date().toISOString();

  const { error: upsertError } = await supabase
    .from("football_card_records")
    .upsert(records, { onConflict: "team_key,player_name" });
  if (upsertError) throw new Error(`Kaarten opslaan mislukt: ${upsertError.message}`);

  const activeKeys = records.map((record) => `${record.team_key}|||${record.player_name}`);
  const { data: existing } = await supabase
    .from("football_card_records")
    .select("id, team_key, player_name");
  const staleIds = (existing ?? [])
    .filter((row) => !activeKeys.includes(`${row.team_key}|||${row.player_name}`))
    .map((row) => row.id);
  if (staleIds.length) await supabase.from("football_card_records").delete().in("id", staleIds);

  await supabase.from("football_card_sync_state").upsert({
    id: 1,
    club_id: CLUB_ID,
    source_url: SOURCE_URL,
    last_sync_at: fetchedAt,
    last_success_at: fetchedAt,
    last_error: null,
    records_count: records.length,
  }, { onConflict: "id" });

  return { records, fetchedAt };
}

export async function rememberFootballCardsError(error: unknown) {
  const supabase = getSupabaseAdmin();
  const message = error instanceof Error ? error.message : "Onbekende fout.";
  await supabase.from("football_card_sync_state").upsert({
    id: 1,
    club_id: CLUB_ID,
    source_url: SOURCE_URL,
    last_sync_at: new Date().toISOString(),
    last_error: message,
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
