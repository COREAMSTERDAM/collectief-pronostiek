import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVENTPAY_HOST = "eendracht-aalst-lede.eventpay.be";
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const REQUEST_TIMEOUT_MS = 10_000;

type ClubCardRow = { id: string; clubcard_code: string; created_at: string };

function decodeBasicHtmlEntities(value: string) {
  return value.replace(/&nbsp;|&#160;|&#xA0;/gi, " ").replace(/&euro;|&#8364;|&#x20AC;/gi, "€").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

function htmlToReadableText(html: string) {
  return decodeBasicHtmlEntities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function parseBalance(html: string) {
  const text = htmlToReadableText(html);
  const amountPattern = String.raw`(?:€\s*\d[\d.\s]*,\d{2}|\d[\d.\s]*,\d{2}\s*€)`;
  const labelledMatch = text.match(new RegExp(String.raw`(?:Your balance is|Current balance|Huidig saldo)\s*(${amountPattern})`, "i"));
  const rawBalance = labelledMatch?.[1];
  if (!rawBalance) throw new Error("Het actuele saldo kon niet op de EventPay-pagina worden gevonden.");

  const normalizedBalance = rawBalance.replace(/\s+/g, " ").trim();
  const amount = Number(normalizedBalance.replace("€", "").replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(amount)) throw new Error("Het gevonden saldo had een onverwacht formaat.");

  return { formatted: new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(amount), amount, currency: "EUR" as const };
}

async function fetchCardBalance(card: ClubCardRow) {
  if (!CODE_PATTERN.test(card.clubcard_code)) throw new Error("De opgeslagen Club Card-code heeft een ongeldig formaat.");

  const walletUrl = new URL(`/w/${encodeURIComponent(card.clubcard_code)}/wallet`, `https://${EVENTPAY_HOST}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(walletUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "Collectief-Wit-en-Zwet-ClubCard/1.0" },
    });

    if (!response.ok) throw new Error(`EventPay gaf een onverwachte status terug (${response.status}).`);
    const balance = parseBalance(await response.text());
    return { id: card.id, balance, fetched_at: new Date().toISOString(), source: "eventpay" as const };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("EventPay reageerde niet op tijd. Probeer straks opnieuw.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function statusForMessage(message: string) {
  if (message.includes("Niet aangemeld") || message.includes("sessie")) return 401;
  if (message.includes("Geen Club Card")) return 404;
  if (message.includes("EventPay") || message.includes("saldo")) return 502;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("profile_club_cards")
      .select("id, clubcard_code, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(2);

    if (error) throw new Error(`Club Cards ophalen mislukt: ${error.message}`);
    const clubCards = (data as ClubCardRow[] | null) ?? [];

    if (clubCards.length === 0) {
      return NextResponse.json({ error: "Geen Club Card gekoppeld. Voeg eerst een Club Card toe via je profiel.", code: "CLUB_CARD_NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const cards = await Promise.all(clubCards.map(fetchCardBalance));
    return NextResponse.json({ cards }, { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Het saldo kon niet worden opgehaald.";
    return NextResponse.json({ error: message }, { status: statusForMessage(message), headers: { "Cache-Control": "no-store" } });
  }
}
