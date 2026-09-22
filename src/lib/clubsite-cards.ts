import "server-only";

import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

const SOURCE_URL = "https://www.eendracht-aalst-lede.be/sportief/eerste-elftal/spelers-staff/";
const CLUB_ID = "1676";
const TEAM_KEY = "eerste-elftal";
const TEAM_LABEL = "Eerste elftal";

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

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
    "&eacute;": "é",
    "&Eacute;": "É",
    "&euml;": "ë",
    "&iuml;": "ï",
    "&ouml;": "ö",
    "&uuml;": "ü",
    "&aacute;": "á",
    "&agrave;": "à",
    "&ccedil;": "ç",
  };

  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&(amp|quot|#39|apos|lt|gt|nbsp|eacute|Eacute|euml|iuml|ouml|uuml|aacute|agrave|ccedil);/g, (entity) => entities[entity] ?? entity);
}

function htmlToText(value: string) {
  return normalizeSpace(
    decodeHtml(
      value
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "),
    ),
  );
}

/**
 * De officiële clubsite toont bij elke speler zes cijfers in deze volgorde:
 * rugnummer, wedstrijden, doelpunten, assists, gele kaarten, rode kaarten.
 * We lezen alleen spelers uit het eerste elftal en publiceren uitsluitend de
 * twee kaartkolommen. We leiden geen schorsingen af als de bron die niet meldt.
 */
function parseFirstTeamCards(html: string, fetchedAt: string): FootballCardRecord[] {
  const records: FootballCardRecord[] = [];
  const playerBlock = /<h3\b[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3\b|<h2\b|$)/gi;

  for (const match of html.matchAll(playerBlock)) {
    const playerName = htmlToText(match[1] ?? "");
    if (!playerName || /^(staff|transfers?)$/i.test(playerName)) continue;

    const block = match[2] ?? "";
    const textTokens = decodeHtml(
      block
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<(?:br|\/p|\/div|\/li|\/span|\/a|\/strong|\/small)>/gi, "\n")
        .replace(/<[^>]+>/g, "\n"),
    )
      .split(/\r?\n/)
      .map((part) => normalizeSpace(part))
      .filter(Boolean);

    const numbers = textTokens
      .filter((token) => /^\d{1,3}$/.test(token))
      .map(Number);

    // Rugnummer + wedstrijden + goals + assists + geel + rood.
    if (numbers.length < 6) continue;

    const yellow = numbers[4] ?? 0;
    const red = numbers[5] ?? 0;

    // Voor deze pagina willen we alleen spelers tonen die effectief een kaart hebben.
    if (yellow === 0 && red === 0) continue;

    records.push({
      team_key: TEAM_KEY,
      team_label: TEAM_LABEL,
      player_name: playerName,
      yellow_cards: yellow,
      second_yellow_red: 0,
      red_cards: red,
      suspension_note: null,
      source_url: SOURCE_URL,
      fetched_at: fetchedAt,
    });
  }

  const unique = new Map<string, FootballCardRecord>();
  for (const record of records) unique.set(record.player_name.toLocaleLowerCase("nl-BE"), record);
  return [...unique.values()].sort((a, b) =>
    b.yellow_cards - a.yellow_cards || b.red_cards - a.red_cards || a.player_name.localeCompare(b.player_name, "nl-BE"),
  );
}

export async function fetchFootballCardsFromSource() {
  const response = await fetch(SOURCE_URL, {
    cache: "no-store",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; CollectiefWitEnZwet/1.0; +https://app.collectiefwitenzwet.be)",
      "accept-language": "nl-BE,nl;q=0.9,en;q=0.5",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`De clubsite antwoordde met HTTP ${response.status}. De vorige opgeslagen gegevens blijven behouden.`);
  }

  const html = await response.text();
  const fetchedAt = new Date().toISOString();
  const records = parseFirstTeamCards(html, fetchedAt);

  if (!records.length) {
    throw new Error(
      "De clubsite werd bereikt, maar er konden geen kaartstatistieken van het eerste elftal worden herkend. De vorige opgeslagen gegevens blijven behouden.",
    );
  }

  return records;
}

export async function syncFootballCards() {
  const supabase = getSupabaseAdmin();
  const records = await fetchFootballCardsFromSource();
  const fetchedAt = records[0]?.fetched_at ?? new Date().toISOString();

  const { error: upsertError } = await supabase
    .from("football_card_records")
    .upsert(records, { onConflict: "team_key,player_name" });
  if (upsertError) throw new Error(`Kaarten opslaan mislukt: ${upsertError.message}`);

  // Deze bron is voortaan uitsluitend het eerste elftal. Verwijder oude jeugd-/VV-data
  // en spelers die niet meer in de actuele kaartlijst voorkomen.
  const activeNames = new Set(records.map((record) => record.player_name));
  const { data: existing } = await supabase
    .from("football_card_records")
    .select("id, team_key, player_name");
  const staleIds = (existing ?? [])
    .filter((row) => row.team_key !== TEAM_KEY || !activeNames.has(row.player_name))
    .map((row) => row.id);
  if (staleIds.length) {
    const { error: deleteError } = await supabase.from("football_card_records").delete().in("id", staleIds);
    if (deleteError) throw new Error(`Oude kaartgegevens opruimen mislukt: ${deleteError.message}`);
  }

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
    supabase
      .from("football_card_records")
      .select("*")
      .eq("team_key", TEAM_KEY)
      .order("yellow_cards", { ascending: false })
      .order("red_cards", { ascending: false })
      .order("player_name"),
    supabase.from("football_card_sync_state").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (error) throw new Error(`Kaarten laden mislukt: ${error.message}`);
  return { records: records ?? [], state: state ?? null, sourceUrl: SOURCE_URL };
}
