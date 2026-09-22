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

function documentBaseUrl(html: string, pageUrl: string) {
  const match = html.match(/<base\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  if (!match) return pageUrl;
  try { return new URL(match[1], pageUrl).toString(); } catch { return pageUrl; }
}

function resourceUrls(text: string, base: string) {
  const urls = new Set<string>();
  const add = (raw: string) => {
    if (!raw || raw.startsWith("data:")) return;
    const url = absoluteUrl(raw.replace(/\\u002F/g, "/").replace(/\\\//g, "/"), base);
    if (!url) return;
    if (/\.(?:m?js|json)(?:\?|$)/i.test(url)) urls.add(url);
  };

  for (const match of text.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of text.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)) add(match[1]);
  for (const match of text.matchAll(/["']([^"']+\.(?:m?js|json)(?:\?[^"']*)?)["']/gi)) add(match[1]);
  // Webpack/Vite chunks worden soms zonder afsluitende extensiequote opgebouwd.
  for (const match of text.matchAll(/(?:src:|href:|import\()\s*["']([^"']+)["']/gi)) add(match[1]);

  return [...urls];
}

function operationCandidates(js: string) {
  const items: Array<{ operation: string; index: number }> = [];
  const seen = new Set<string>();
  const add = (operation: string, index: number) => {
    if (!/^[A-Za-z][A-Za-z0-9_]{2,90}$/.test(operation)) return;
    if (!/(club|team|card|yellow|red|sanction|suspens|disciplin|player|member|person|squad)/i.test(operation)) return;
    const key = `${operation}|${index}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ operation, index });
  };

  for (const match of js.matchAll(/operationName\s*[:=]\s*["']([A-Za-z0-9_]+)/g)) add(match[1], match.index ?? 0);
  for (const match of js.matchAll(/\bquery\s+([A-Za-z0-9_]+)/g)) add(match[1], match.index ?? 0);
  for (const match of js.matchAll(/\b((?:Get|Fetch|Load|Find|Search)[A-Z][A-Za-z0-9_]{2,80})\b/g)) add(match[1], match.index ?? 0);
  for (const match of js.matchAll(/["']([A-Za-z][A-Za-z0-9_]{3,80})["']/g)) add(match[1], match.index ?? 0);

  return items;
}

function persistedCandidates(js: string): PersistedCandidate[] {
  const found = new Map<string, PersistedCandidate>();
  const hashes = [...js.matchAll(/[a-f0-9]{64}/gi)];
  const ops = operationCandidates(js);

  for (const hashMatch of hashes) {
    const hash = hashMatch[0].toLowerCase();
    const index = hashMatch.index ?? 0;
    const nearbyText = js.slice(Math.max(0, index - 18000), Math.min(js.length, index + 18000));
    const nearbyOps = ops
      .filter((item) => Math.abs(item.index - index) <= 18000)
      .sort((a, b) => Math.abs(a.index - index) - Math.abs(b.index - index))
      .slice(0, 30);

    for (const item of nearbyOps) {
      const operation = item.operation;
      let score = 0;
      if (/card|yellow|red|sanction|suspens|disciplin|penalt/i.test(operation)) score += 30;
      if (/club.*team|team.*club/i.test(operation)) score += 22;
      if (/club|team/i.test(operation)) score += 10;
      if (/player|member|person|squad/i.test(operation)) score += 7;
      if (/card|yellow|red|sanction|suspens|disciplin|penalt/i.test(nearbyText)) score += 10;
      if (/clubId|teamId|organizationId|organisationId/i.test(nearbyText)) score += 5;
      const distance = Math.abs(item.index - index);
      if (distance < 500) score += 12;
      else if (distance < 1800) score += 8;
      else if (distance < 5000) score += 4;
      if (score < 12) continue;
      const key = `${operation}|${hash}`;
      const previous = found.get(key);
      if (!previous || previous.score < score) found.set(key, { operation, hash, score });
    }
  }

  return [...found.values()].sort((a, b) => b.score - a.score).slice(0, 140);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/javascript,text/javascript,application/json,*/*;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} antwoordde met ${response.status}.`);
  return response.text();
}

async function discoverFrontendResources(html: string, baseUrl: string) {
  // Angular gebruikt op Voetbal Vlaanderen een <base href="/">. Relative script-URLs
  // moeten daarom tegen die document-base worden opgelost, niet tegen /club/1676/kaarten.
  const effectiveBase = documentBaseUrl(html, baseUrl);
  const queue = resourceUrls(html, effectiveBase);
  const visited = new Set<string>();
  const documents: Array<{ url: string; text: string }> = [];

  // De kaartenpagina gebruikt lazy-loaded chunks. Daarom volgen we ook JS-chunks die
  // vanuit de eerste bundels worden gerefereerd, met een harde bovengrens.
  while (queue.length && visited.size < 80) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const text = await fetchText(url);
      documents.push({ url, text });
      for (const nested of resourceUrls(text, url)) {
        if (!visited.has(nested) && queue.length < 140) queue.push(nested);
      }
    } catch {
      // Een ontbrekende lazy chunk is niet fataal.
    }
  }

  return documents;
}

async function callPersisted(candidate: PersistedCandidate, variables: JsonRecord) {
  const body = {
    operationName: candidate.operation,
    variables: { ...variables, language: "nl" },
    extensions: { persistedQuery: { version: 1, sha256Hash: candidate.hash } },
  };

  const headers = {
    accept: "application/json",
    "content-type": "application/json",
    "x-apollo-operation-name": candidate.operation,
    "apollo-require-preflight": "true",
    "user-agent": "CollectiefWitEnZwet/1.0 (+https://app.collectiefwitenzwet.be)",
  };

  // Eerst POST: dat is minder gevoelig voor URL-encoding en wordt door de actuele
  // Apollo-configuratie gebruikt. Bij een niet-bruikbare response proberen we GET.
  for (const method of ["POST", "GET"] as const) {
    let response: Response;
    if (method === "POST") {
      response = await fetch(GRAPHQL_URL, { method, headers, body: JSON.stringify(body), cache: "no-store" });
    } else {
      const params = new URLSearchParams({
        operationName: candidate.operation,
        variables: JSON.stringify(body.variables),
        extensions: JSON.stringify(body.extensions),
      });
      response = await fetch(`${GRAPHQL_URL}?${params.toString()}`, { headers, cache: "no-store" });
    }

    const json = await response.json().catch(() => null);
    const record = asRecord(json);
    const errors = asArray(record?.errors)
      .map((item) => firstString(asRecord(item) ?? {}, ["message"]))
      .filter(Boolean);

    if (response.ok && record && asRecord(record.data)) {
      return { payload: record, error: errors[0] ? `${candidate.operation}: ${errors[0]}` : null };
    }

    const error = `${candidate.operation}: HTTP ${response.status}${errors[0] ? ` · ${errors[0]}` : ""}`;
    if (method === "GET") return { payload: null as JsonRecord | null, error };
  }

  return { payload: null as JsonRecord | null, error: `${candidate.operation}: geen data` };
}

function recordsFromPayload(payload: unknown, fetchedAt: string) {
  const records: FootballCardRecord[] = [];
  for (const obj of recursiveObjects(payload)) {
    const record = recordFromObject(obj, fetchedAt);
    if (record) records.push(record);
  }
  return dedupe(records);
}

function variablesForOperation(operation: string) {
  const sets: JsonRecord[] = [
    { clubId: CLUB_ID },
    { clubId: Number(CLUB_ID) },
    { clubID: CLUB_ID },
    { id: CLUB_ID },
    { organizationId: CLUB_ID },
    { organisationId: CLUB_ID },
  ];

  // Alleen voor operaties die duidelijk seizoensdata verwachten enkele extra pogingen.
  if (/card|sanction|suspens|disciplin/i.test(operation)) {
    sets.push(
      { clubId: CLUB_ID, season: "2026-2027" },
      { clubId: CLUB_ID, season: "2026" },
    );
  }
  return sets;
}

async function fetchFromDiscoveredGraphql(html: string, fetchedAt: string, baseUrl = SOURCE_URL) {
  const documents = await discoverFrontendResources(html, baseUrl);
  const candidates: PersistedCandidate[] = [];
  const graphqlErrors: string[] = [];

  for (const document of documents) candidates.push(...persistedCandidates(document.text));

  const unique = new Map<string, PersistedCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.operation}|${candidate.hash}`;
    const previous = unique.get(key);
    if (!previous || candidate.score > previous.score) unique.set(key, candidate);
  }
  const ordered = [...unique.values()].sort((a, b) => b.score - a.score).slice(0, 24);

  // Een candidate met een fout hash/operation is goedkoop om te verwerpen. Zodra
  // Apollo bevestigt dat de persisted query bestaat, proberen we de variabelen.
  for (const candidate of ordered) {
    const variableSets = variablesForOperation(candidate.operation);
    for (const variables of variableSets) {
      try {
        const result = await callPersisted(candidate, variables);
        if (result.error && graphqlErrors.length < 20) graphqlErrors.push(result.error);
        if (!result.payload) {
          // Als Apollo de persisted query zelf niet kent, hebben andere variabelen geen zin.
          if (/PersistedQueryNotFound|persisted query not found/i.test(result.error ?? "")) break;
          continue;
        }
        const records = recordsFromPayload(result.payload, fetchedAt);
        if (records.length) {
          return {
            records,
            operation: candidate.operation,
            diagnostics: {
              assetCount: documents.length,
              candidates: ordered.map((x) => x.operation).slice(0, 18),
              graphqlErrors,
            },
          };
        }
      } catch (error) {
        if (graphqlErrors.length < 20) graphqlErrors.push(error instanceof Error ? error.message : "GraphQL-fout");
      }
    }
  }

  return {
    records: [] as FootballCardRecord[],
    operation: null as string | null,
    diagnostics: {
      assetCount: documents.length,
      candidates: ordered.map((x) => x.operation).slice(0, 18),
      graphqlErrors,
    },
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


export type FootballCardsDiagnostic = {
  generatedAt: string;
  clubId: string;
  sourceUrl: string;
  documentBase: string;
  pages: Array<{
    url: string;
    status: number | null;
    ok: boolean;
    contentType: string | null;
    length: number;
    baseHref: string | null;
    scriptCount: number;
    scripts: string[];
    htmlHits: Array<{ term: string; snippet: string }>;
    error?: string;
  }>;
  assets: Array<{
    url: string;
    status: number | null;
    ok: boolean;
    contentType: string | null;
    length: number;
    hits: Array<{ term: string; snippet: string }>;
    urls: string[];
    operationNames: string[];
    persistedCandidates: Array<{ operation: string; hash: string; score: number }>;
    error?: string;
  }>;
};

function diagnosticSnippet(text: string, index: number, radius = 320) {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)).replace(/\s+/g, " ").trim();
}

function diagnosticHits(text: string) {
  const terms = [
    "kaarten", "cards", "card", "disciplinary", "suspension", "schors",
    "teamId", "teamID", "clubId", "clubID", "clubTeams", "teamsByClub",
    "GetClub", "GetTeam", "apollo", "graphql", "persistedQuery",
  ];
  const hits: Array<{ term: string; snippet: string }> = [];
  const lower = text.toLowerCase();
  for (const term of terms) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx >= 0) hits.push({ term, snippet: diagnosticSnippet(text, idx) });
    if (hits.length >= 12) break;
  }
  return hits;
}

function operationNamesFromText(text: string) {
  const names = new Set<string>();
  const patterns = [
    /operationName["']?\s*[:=]\s*["']([A-Za-z0-9_]{3,80})["']/g,
    /(?:query|mutation)\s+([A-Za-z_][A-Za-z0-9_]{2,79})\b/g,
    /["'](Get[A-Z][A-Za-z0-9_]{2,79})["']/g,
  ];
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) names.add(match[1]);
  return [...names].slice(0, 80);
}

function endpointUrlsFromText(text: string) {
  const urls = new Set<string>();
  for (const match of text.matchAll(/https?:\\?\/\\?\/[^"'`\s)]+/g)) {
    const clean = match[0].replace(/\\\//g, "/");
    if (/rbfa|voetbalvlaanderen|graphql|api/i.test(clean)) urls.add(clean.slice(0, 500));
  }
  return [...urls].slice(0, 40);
}

export async function buildFootballCardsDiagnostics(): Promise<FootballCardsDiagnostic> {
  const pages: FootballCardsDiagnostic["pages"] = [];
  const assetSet = new Set<string>();
  const pageUrls = [SOURCE_URL, CLUB_TEAMS_URL];
  let firstDocumentBase = SOURCE_URL;

  for (const url of pageUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "accept-language": "nl-BE,nl;q=0.9,en;q=0.5",
          "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)",
        },
        cache: "no-store",
        redirect: "follow",
      });
      const text = await response.text();
      const baseMatch = text.match(/<base\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
      const effectiveBase = documentBaseUrl(text, response.url || url);
      if (url === SOURCE_URL) firstDocumentBase = effectiveBase;
      const scripts = resourceUrls(text, effectiveBase).filter((item) => /\.(?:m?js)(?:\?|$)/i.test(item));
      scripts.forEach((item) => assetSet.add(item));
      pages.push({
        url,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        length: text.length,
        baseHref: baseMatch?.[1] ?? null,
        scriptCount: scripts.length,
        scripts: scripts.slice(0, 40),
        htmlHits: diagnosticHits(text),
      });
    } catch (error) {
      pages.push({
        url,
        status: null,
        ok: false,
        contentType: null,
        length: 0,
        baseHref: null,
        scriptCount: 0,
        scripts: [],
        htmlHits: [],
        error: error instanceof Error ? error.message : "Onbekende fout",
      });
    }
  }

  const assets: FootballCardsDiagnostic["assets"] = [];
  const queue = [...assetSet];
  const visited = new Set<string>();
  while (queue.length && visited.size < 60) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const response = await fetch(url, {
        headers: { accept: "*/*", "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)" },
        cache: "no-store",
        redirect: "follow",
      });
      const text = await response.text();
      const nested = resourceUrls(text, url);
      nested.forEach((item) => { if (!visited.has(item) && queue.length < 120) queue.push(item); });
      const candidates = persistedCandidates(text).slice(0, 25);
      const hits = diagnosticHits(text);
      const operationNames = operationNamesFromText(text);
      const urls = endpointUrlsFromText(text);
      if (hits.length || operationNames.length || urls.length || candidates.length) {
        assets.push({
          url,
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get("content-type"),
          length: text.length,
          hits,
          urls,
          operationNames,
          persistedCandidates: candidates,
        });
      }
    } catch (error) {
      assets.push({
        url,
        status: null,
        ok: false,
        contentType: null,
        length: 0,
        hits: [],
        urls: [],
        operationNames: [],
        persistedCandidates: [],
        error: error instanceof Error ? error.message : "Onbekende fout",
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    clubId: CLUB_ID,
    sourceUrl: SOURCE_URL,
    documentBase: firstDocumentBase,
    pages,
    assets,
  };
}
