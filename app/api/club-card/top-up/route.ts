import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EVENTPAY_HOST = "eendracht-aalst-lede.eventpay.be";
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

type ClubCardRow = { id: string; clubcard_code: string };

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json().catch(() => ({}))) as { cardId?: string };

    let query = supabaseAdmin.from("profile_club_cards").select("id, clubcard_code").eq("user_id", user.id);
    if (body.cardId) query = query.eq("id", body.cardId);

    const { data, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (error) throw new Error(`Club Card ophalen mislukt: ${error.message}`);

    const clubCard = data as ClubCardRow | null;
    if (!clubCard?.clubcard_code) {
      return NextResponse.json({ error: "Geen Club Card gevonden.", code: "CLUB_CARD_NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    if (!CODE_PATTERN.test(clubCard.clubcard_code)) throw new Error("De opgeslagen Club Card-code heeft een ongeldig formaat.");

    const topUpUrl = new URL(`/w/${encodeURIComponent(clubCard.clubcard_code)}/wallet`, `https://${EVENTPAY_HOST}`);
    return NextResponse.json({ url: topUpUrl.toString() }, { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "De oplaadpagina kon niet worden geopend.";
    return NextResponse.json({ error: message }, { status: message.includes("aangemeld") || message.includes("sessie") ? 401 : 500, headers: { "Cache-Control": "no-store" } });
  }
}
