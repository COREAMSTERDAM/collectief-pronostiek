import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function statusFor(message: string) {
  if (message.includes("beheerdersrechten")) return 403;
  if (message.includes("aangemeld") || message.includes("sessie")) return 401;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("supporter_clubs")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(`Supportersclubs ophalen mislukt: ${error.message}`);
    return NextResponse.json({ clubs: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("supporter_clubs")
      .insert({
        name,
        logo_url: body.logo_url || null,
        logo_path: body.logo_path || null,
        city: String(body.city ?? "").trim() || null,
        contact_name: String(body.contact_name ?? "").trim() || null,
        email: String(body.email ?? "").trim() || null,
        phone: String(body.phone ?? "").trim() || null,
        website_url: String(body.website_url ?? "").trim() || null,
        facebook_url: String(body.facebook_url ?? "").trim() || null,
        meeting_place: String(body.meeting_place ?? "").trim() || null,
        description: String(body.description ?? "").trim() || null,
        travel_info: String(body.travel_info ?? "").trim() || null,
        activities_info: String(body.activities_info ?? "").trim() || null,
        is_active: body.is_active !== false,
        sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
      })
      .select("*")
      .single();
    if (error) throw new Error(`Supportersclub toevoegen mislukt: ${error.message}`);
    return NextResponse.json({ club: data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
