import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

function statusFor(message: string) {
  if (message.includes("beheerdersrechten")) return 403;
  if (message.includes("aangemeld") || message.includes("sessie")) return 401;
  return 500;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await requireAppAdmin(request);
    const { id } = await context.params;
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });

    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("supporter_clubs")
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(`Supportersclub wijzigen mislukt: ${error.message}`);
    return NextResponse.json({ club: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    await requireAppAdmin(request);
    const { id } = await context.params;
    const admin = getSupabaseAdmin();

    const { data: existing } = await admin
      .from("supporter_clubs")
      .select("logo_path")
      .eq("id", id)
      .maybeSingle();

    const { error } = await admin.from("supporter_clubs").delete().eq("id", id);
    if (error) throw new Error(`Supportersclub verwijderen mislukt: ${error.message}`);

    if (existing?.logo_path) {
      await admin.storage.from("supporter-club-logos").remove([existing.logo_path]);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: statusFor(message) });
  }
}
