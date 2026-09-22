import "server-only";

import chromium from "@sparticuz/chromium";
import puppeteer, { type Browser, type Page } from "puppeteer-core";
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

type TeamChoice = { value: string; label: string };
type TeamControl = { kind: "native" | "custom" | "single"; choices: TeamChoice[] };
type RenderedRow = {
  playerName: string;
  yellow: number;
  secondYellow: number;
  red: number;
  suspension: string;
  rowTeam: string;
};

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeTeamLabel(value: string) {
  const cleaned = normalizeSpace(value)
    .replace(/^koninklijke\s+eendracht\s+aalst\s+lede\s*/i, "")
    .replace(/^eendracht\s+aalst[- ]lede\s*/i, "")
    .replace(/^k\.?\s*eendracht\s+aalst\s+lede\s*/i, "")
    .trim();

  if (!cleaned || /^(a|1|eerste|eerste ploeg|eerste elftal|1e ploeg)$/i.test(cleaned)) return "Eerste elftal";
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

function looksLikeTeam(value: string) {
  const text = normalizeSpace(value);
  if (!text) return false;
  return /^(?:eerste(?:\s+(?:elftal|ploeg))?|1e\s+ploeg|a-?ploeg|reserven|beloften|u\s?\d{1,2}(?:\s+[a-z])?|dames|meisjes|g-?voetbal|senioren)/i.test(text);
}

function usefulChoice(value: string) {
  const text = normalizeSpace(value);
  if (!text) return false;
  if (/^(?:kies|selecteer|alle ploegen|ploeg|team|-+)$/i.test(text)) return false;
  return true;
}

function dedupe(records: FootballCardRecord[]) {
  const map = new Map<string, FootballCardRecord>();
  for (const record of records) {
    const key = `${record.team_key}|${record.player_name.toLowerCase()}`;
    const previous = map.get(key);
    const total = record.yellow_cards + record.second_yellow_red + record.red_cards;
    const oldTotal = previous ? previous.yellow_cards + previous.second_yellow_red + previous.red_cards : -1;
    if (!previous || total > oldTotal) map.set(key, record);
  }
  return [...map.values()];
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchBrowser(): Promise<Browser> {
  chromium.setGraphicsMode = false;
  const executablePath = process.env.CHROME_EXECUTABLE_PATH || await chromium.executablePath();
  return puppeteer.launch({
    executablePath,
    headless: "shell",
    args: [
      ...chromium.args,
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
    ],
    defaultViewport: { width: 1440, height: 1400, deviceScaleFactor: 1 },
  });
}

async function settle(page: Page) {
  await page.waitForNetworkIdle({ idleTime: 700, timeout: 8_000 }).catch(() => undefined);
  await sleep(900);
}

async function dismissConsent(page: Page) {
  await page.evaluate(() => {
    const labels = [
      "alles accepteren", "accepteren", "akkoord", "toestaan", "accept all",
      "alle cookies accepteren", "doorgaan zonder accepteren",
    ];
    const buttons = Array.from(document.querySelectorAll("button, [role='button']")) as HTMLElement[];
    const button = buttons.find((item) => {
      const text = (item.innerText || item.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      return labels.some((label) => text === label || text.includes(label));
    });
    button?.click();
  }).catch(() => undefined);
  await sleep(300);
}

async function discoverTeamControl(page: Page): Promise<TeamControl> {
  const native = await page.evaluate(() => {
    const clean = (value: string) => value.replace(/\s+/g, " ").trim();
    const teamish = (value: string) => /^(?:eerste|1e\s+ploeg|a-?ploeg|reserven|beloften|u\s?\d{1,2}|dames|meisjes|g-?voetbal|senioren)/i.test(clean(value));
    const selects = Array.from(document.querySelectorAll("select")) as HTMLSelectElement[];
    let best: { element: HTMLSelectElement; score: number } | null = null;

    for (const select of selects) {
      const options = Array.from(select.options).map((option) => clean(option.textContent || "")).filter(Boolean);
      const nearby = clean(select.closest("label, fieldset, section, div")?.textContent || "");
      let score = options.filter(teamish).length * 10;
      if (/ploeg|team|categorie/i.test(nearby)) score += 40;
      if (options.length >= 2) score += 5;
      if (!best || score > best.score) best = { element: select, score };
    }

    if (!best || best.score < 10) return null;
    best.element.setAttribute("data-cwz-team-select", "1");
    return Array.from(best.element.options).map((option) => ({
      value: option.value,
      label: clean(option.textContent || ""),
    }));
  });

  if (native?.length) {
    const choices = native.filter((choice) => usefulChoice(choice.label));
    if (choices.length) return { kind: "native", choices };
  }

  const customFound = await page.evaluate(() => {
    const clean = (value: string) => value.replace(/\s+/g, " ").trim();
    const candidates = Array.from(document.querySelectorAll(
      "[role='combobox'], mat-select, .mat-mdc-select, .mat-select, ng-select, .ng-select",
    )) as HTMLElement[];
    let best: { element: HTMLElement; score: number } | null = null;
    for (const element of candidates) {
      const nearby = clean(element.closest("label, fieldset, section, div")?.textContent || "");
      const own = clean(element.innerText || element.textContent || "");
      let score = 0;
      if (/ploeg|team|categorie/i.test(nearby)) score += 50;
      if (/eerste|reserven|beloften|u\s?\d{1,2}/i.test(own)) score += 20;
      if (!best || score > best.score) best = { element, score };
    }
    if (!best || best.score < 20) return false;
    best.element.setAttribute("data-cwz-team-combobox", "1");
    best.element.click();
    return true;
  });

  if (customFound) {
    await sleep(500);
    const options = await page.evaluate(() => {
      const clean = (value: string) => value.replace(/\s+/g, " ").trim();
      const visible = (element: Element) => {
        const style = getComputedStyle(element as HTMLElement);
        const rect = (element as HTMLElement).getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      };
      const nodes = Array.from(document.querySelectorAll(
        "[role='option'], mat-option, .mat-mdc-option, .mat-option, .ng-option, option",
      )).filter(visible);
      const labels = nodes.map((node) => clean((node as HTMLElement).innerText || node.textContent || "")).filter(Boolean);
      return [...new Set(labels)];
    });
    await page.keyboard.press("Escape").catch(() => undefined);
    const choices = options.filter(usefulChoice).map((label) => ({ value: label, label }));
    if (choices.length) return { kind: "custom", choices };
  }

  // Sommige pagina's tonen geen echte dropdown wanneer er maar één ploeg actief is.
  return { kind: "single", choices: [{ value: "Eerste elftal", label: "Eerste elftal" }] };
}

async function selectTeam(page: Page, control: TeamControl, choice: TeamChoice) {
  if (control.kind === "single") return;

  if (control.kind === "native") {
    await page.select('select[data-cwz-team-select="1"]', choice.value);
    await page.evaluate(() => {
      const select = document.querySelector('select[data-cwz-team-select="1"]') as HTMLSelectElement | null;
      if (!select) return;
      select.dispatchEvent(new Event("input", { bubbles: true }));
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await settle(page);
    return;
  }

  await page.evaluate(() => {
    (document.querySelector('[data-cwz-team-combobox="1"]') as HTMLElement | null)?.click();
  });
  await sleep(350);
  const clicked = await page.evaluate((target) => {
    const clean = (value: string) => value.replace(/\s+/g, " ").trim().toLowerCase();
    const wanted = clean(target);
    const visible = (element: Element) => {
      const style = getComputedStyle(element as HTMLElement);
      const rect = (element as HTMLElement).getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const nodes = Array.from(document.querySelectorAll(
      "[role='option'], mat-option, .mat-mdc-option, .mat-option, .ng-option",
    )).filter(visible) as HTMLElement[];
    const option = nodes.find((node) => clean(node.innerText || node.textContent || "") === wanted)
      || nodes.find((node) => clean(node.innerText || node.textContent || "").includes(wanted));
    option?.click();
    return Boolean(option);
  }, choice.label);
  if (!clicked) throw new Error(`Ploeg '${choice.label}' kon op Voetbal Vlaanderen niet worden geselecteerd.`);
  await settle(page);
}

async function scrapeVisibleRows(page: Page): Promise<RenderedRow[]> {
  return page.evaluate(() => {
    const clean = (value: string) => value.replace(/\s+/g, " ").trim();
    const num = (value: string) => Number(clean(value).match(/\d+/)?.[0] || 0);
    const visible = (element: Element) => {
      const style = getComputedStyle(element as HTMLElement);
      const rect = (element as HTMLElement).getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const headerIndex = (headers: string[], pattern: RegExp, reject?: RegExp) =>
      headers.findIndex((header) => pattern.test(header) && !(reject?.test(header)));

    const parseGrid = (headers: string[], rows: string[][]) => {
      const lowered = headers.map((header) => clean(header).toLowerCase());
      let player = headerIndex(lowered, /speler|naam|player/);
      const yellow = headerIndex(lowered, /geel|yellow/, /rood|red|2e|2de|tweede/);
      const second = headerIndex(lowered, /2.*geel|tweede.*geel|geel.*rood|yellow.*red|second.*yellow/);
      const red = headerIndex(lowered, /rood|red/, /geel|yellow/);
      const suspension = headerIndex(lowered, /schors|sanctie|suspens|status/);
      const team = headerIndex(lowered, /ploeg|team|categorie/);
      if (player < 0 && (yellow >= 0 || second >= 0 || red >= 0)) player = 0;
      if (player < 0 || (yellow < 0 && second < 0 && red < 0)) return [] as RenderedRow[];

      return rows.flatMap((cells) => {
        const playerName = clean(cells[player] || "");
        const y = yellow >= 0 ? num(cells[yellow] || "") : 0;
        const sy = second >= 0 ? num(cells[second] || "") : 0;
        const r = red >= 0 ? num(cells[red] || "") : 0;
        if (!playerName || y + sy + r === 0) return [];
        if (/^(speler|naam|player|totaal)$/i.test(playerName)) return [];
        return [{
          playerName,
          yellow: y,
          secondYellow: sy,
          red: r,
          suspension: suspension >= 0 ? clean(cells[suspension] || "") : "",
          rowTeam: team >= 0 ? clean(cells[team] || "") : "",
        }];
      });
    };

    const output: RenderedRow[] = [];

    for (const table of Array.from(document.querySelectorAll("table")).filter(visible)) {
      const headerCells = Array.from(table.querySelectorAll("thead th, thead [role='columnheader']")) as HTMLElement[];
      let headers = headerCells.map((cell) => clean(cell.innerText || cell.textContent || ""));
      const tr = Array.from(table.querySelectorAll("tr")).filter(visible);
      let start = 0;
      if (!headers.length && tr.length) {
        const firstCells = Array.from(tr[0].querySelectorAll("th, td, [role='cell'], [role='columnheader']")) as HTMLElement[];
        headers = firstCells.map((cell) => clean(cell.innerText || cell.textContent || ""));
        start = 1;
      }
      const rows = tr.slice(start).map((row) =>
        Array.from(row.querySelectorAll("td, th, [role='cell']")).map((cell) => clean((cell as HTMLElement).innerText || cell.textContent || "")),
      ).filter((cells) => cells.length > 1);
      output.push(...parseGrid(headers, rows));
    }

    if (!output.length) {
      const containers = Array.from(document.querySelectorAll(
        "[role='table'], .mat-mdc-table, .mat-table, .cdk-table",
      )).filter(visible) as HTMLElement[];
      for (const container of containers) {
        const headers = Array.from(container.querySelectorAll(
          "[role='columnheader'], .mat-mdc-header-cell, .mat-header-cell",
        )).map((cell) => clean((cell as HTMLElement).innerText || cell.textContent || ""));
        const rows = Array.from(container.querySelectorAll(
          "[role='row'], .mat-mdc-row, .mat-row, .cdk-row",
        )).filter(visible).map((row) =>
          Array.from(row.querySelectorAll("[role='cell'], .mat-mdc-cell, .mat-cell, .cdk-cell"))
            .map((cell) => clean((cell as HTMLElement).innerText || cell.textContent || "")),
        ).filter((cells) => cells.length > 1);
        output.push(...parseGrid(headers, rows));
      }
    }

    // Laatste eenvoudige fallback voor een visuele lijst die geen echte tabel gebruikt.
    if (!output.length) {
      const text = (document.body.innerText || "").replace(/\r/g, "");
      if (/gele?\s+kaart|yellow/i.test(text) && /rode?\s+kaart|red/i.test(text)) {
        const lines = text.split("\n").map(clean).filter(Boolean);
        for (let i = 0; i < lines.length - 3; i += 1) {
          const name = lines[i];
          if (!/^[\p{L}'’.-]+(?:\s+[\p{L}'’.-]+){1,4}$/u.test(name)) continue;
          if (/voetbal|vlaanderen|eendracht|kaarten|schorsingen|ploeg|speler|geel|rood/i.test(name)) continue;
          const numbers = lines.slice(i + 1, i + 5).map((line) => /^\d{1,2}$/.test(line) ? Number(line) : null);
          const present = numbers.filter((value) => value !== null) as number[];
          if (present.length < 2) continue;
          const y = present[0] ?? 0;
          const sy = present.length >= 3 ? present[1] ?? 0 : 0;
          const r = present.length >= 3 ? present[2] ?? 0 : present[1] ?? 0;
          if (y + sy + r === 0) continue;
          output.push({ playerName: name, yellow: y, secondYellow: sy, red: r, suspension: "", rowTeam: "" });
        }
      }
    }

    return output;
  });
}

export async function fetchFootballCardsFromSource() {
  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    page.setDefaultTimeout(20_000);
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
    );
    await page.setExtraHTTPHeaders({ "accept-language": "nl-BE,nl;q=0.9,en;q=0.5" });

    const response = await page.goto(SOURCE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
    if (!response || !response.ok()) {
      throw new Error(`Voetbal Vlaanderen antwoordde met ${response?.status() ?? "geen status"}.`);
    }
    await settle(page);
    await dismissConsent(page);

    const control = await discoverTeamControl(page);
    const fetchedAt = new Date().toISOString();
    const records: FootballCardRecord[] = [];

    for (const choice of control.choices.slice(0, 40)) {
      await selectTeam(page, control, choice);
      const visibleRows = await scrapeVisibleRows(page);
      const fallbackLabel = normalizeTeamLabel(choice.label);
      for (const row of visibleRows) {
        const label = normalizeTeamLabel(row.rowTeam || fallbackLabel);
        records.push({
          team_key: teamKey(label),
          team_label: label,
          player_name: normalizeSpace(row.playerName),
          yellow_cards: row.yellow,
          second_yellow_red: row.secondYellow,
          red_cards: row.red,
          suspension_note: normalizeSpace(row.suspension) || null,
          source_url: SOURCE_URL,
          fetched_at: fetchedAt,
        });
      }
    }

    const cleaned = dedupe(records).filter((record) => record.player_name.length >= 3);
    if (!cleaned.length) {
      throw new Error(
        "Voetbal Vlaanderen werd geopend, maar er konden geen zichtbare kaartregels worden gelezen. De vorige opgeslagen gegevens blijven behouden.",
      );
    }
    return cleaned;
  } catch (error) {
    if (error instanceof Error && /Voetbal Vlaanderen/.test(error.message)) throw error;
    const message = error instanceof Error ? error.message : "Onbekende fout";
    throw new Error(`De Voetbal Vlaanderen-pagina kon niet volledig worden ingelezen (${message}). De vorige opgeslagen gegevens blijven behouden.`);
  } finally {
    await browser?.close().catch(() => undefined);
  }
}

export async function syncFootballCards() {
  const supabase = getSupabaseAdmin();
  const records = await fetchFootballCardsFromSource();
  const fetchedAt = records[0]?.fetched_at ?? new Date().toISOString();

  const { error: upsertError } = await supabase
    .from("football_card_records")
    .upsert(records, { onConflict: "team_key,player_name" });
  if (upsertError) throw new Error(`Kaarten opslaan mislukt: ${upsertError.message}`);

  const activeKeys = new Set(records.map((record) => `${record.team_key}|||${record.player_name}`));
  const { data: existing } = await supabase
    .from("football_card_records")
    .select("id, team_key, player_name");
  const staleIds = (existing ?? [])
    .filter((row) => !activeKeys.has(`${row.team_key}|||${row.player_name}`))
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
