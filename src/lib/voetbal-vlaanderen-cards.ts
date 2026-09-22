import "server-only";

import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

const SOURCE_URL = "https://www.voetbalvlaanderen.be/club/1676/kaarten";
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

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
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
  return value
    .replace(/\s+/g, " ")
    .replace(/^koninklijke\s+eendracht\s+aalst\s+lede\s*/i, "")
    .replace(/^eendracht\s+aalst[- ]lede\s*/i, "")
    .trim() || "Eerste elftal";
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

function findEmbeddedJson(html: string): unknown[] {
  const payloads: unknown[] = [];

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { payloads.push(JSON.parse(match[1])); } catch { /* ignore */ }
  }

  const next = html.match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (next) {
    try { payloads.push(JSON.parse(next[1])); } catch { /* ignore */ }
  }

  return payloads;
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

function recordFromObject(obj: JsonRecord, fetchedAt: string): FootballCardRecord | null {
  const player = asRecord(obj.player) ?? asRecord(obj.person) ?? asRecord(obj.member);
  const playerName = firstString(obj, ["playerName", "fullName", "displayName", "name"]) ||
    (player ? firstString(player, ["fullName", "displayName", "name"]) : "");

  const yellow = firstNumber(obj, ["yellowCards", "yellowCard", "yellow", "cardsYellow", "yellowCount"]);
  const secondYellow = firstNumber(obj, ["secondYellowRed", "secondYellow", "yellowRedCards", "doubleYellowRed"]);
  const red = firstNumber(obj, ["redCards", "redCard", "red", "cardsRed", "redCount"]);

  if (!playerName || (yellow === 0 && secondYellow === 0 && red === 0)) return null;
  if (/eendracht|aalst|lede|eerste elftal|u\d{2}|reserve|beloft/i.test(playerName) && playerName.split(" ").length < 4) return null;

  const team = asRecord(obj.team) ?? asRecord(obj.squad) ?? asRecord(obj.clubTeam);
  const rawTeam = firstString(obj, ["teamName", "teamLabel", "squadName", "categoryName"]) ||
    (team ? firstString(team, ["displayName", "name", "label", "categoryName"]) : "") ||
    "Eerste elftal";
  const label = normalizeTeamLabel(rawTeam);

  return {
    team_key: teamKey(label),
    team_label: label,
    player_name: playerName,
    yellow_cards: yellow,
    second_yellow_red: secondYellow,
    red_cards: red,
    suspension_note: firstString(obj, ["suspension", "suspensionNote", "sanction", "status"]) || null,
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

export async function fetchFootballCardsFromSource() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Voetbal Vlaanderen antwoordde met ${response.status}.`);
  const html = await response.text();
  const fetchedAt = new Date().toISOString();

  const records = parseTables(html, fetchedAt);
  for (const payload of findEmbeddedJson(html)) {
    for (const obj of recursiveObjects(payload)) {
      const record = recordFromObject(obj, fetchedAt);
      if (record) records.push(record);
    }
  }

  const clean = dedupe(records);
  if (!clean.length) {
    throw new Error(
      "De kaartenpagina werd bereikt, maar de kaarten-data kon niet betrouwbaar worden herkend. De vorige snapshot blijft behouden.",
    );
  }
  return clean;
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
