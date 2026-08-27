import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ userId: string }> };
type LevelKey = "guest" | "white_member" | "black_member";
type UpdateUserBody = {
  name?: string;
  email?: string;
  membership_level_key?: LevelKey;
  membership_starts_at?: string;
};

function normalizeEmail(value: string) { return value.trim().toLowerCase(); }
function getStatus(message: string) {
  if (message.includes("Administrators kunnen niet") || message.includes("administratoraccount") || message.includes("beheerdersrechten")) return 403;
  if (message.includes("aangemeld") || message.includes("sessie")) return 401;
  return 500;
}

async function ensureTargetIsNotAdmin(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile, error } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  if (error) throw new Error(`Doelaccount controleren mislukt: ${error.message}`);
  if (profile?.is_admin) throw new Error("Administrators kunnen niet door andere administrators worden gewijzigd of verwijderd.");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAppAdmin(request);
    const { userId } = await context.params;
    await ensureTargetIsNotAdmin(userId);
    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json()) as UpdateUserBody;

    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : undefined;
    const membership = body.membership_level_key;

    if (name === undefined && email === undefined && membership === undefined) {
      return NextResponse.json({ error: "Er zijn geen wijzigingen opgegeven." }, { status: 400 });
    }
    if (email !== undefined && !email.includes("@")) {
      return NextResponse.json({ error: "Het e-mailadres is niet geldig." }, { status: 400 });
    }
    if (email !== undefined) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { email, email_confirm: true });
      if (error) throw new Error(`E-mailadres aanpassen mislukt: ${error.message}`);
    }
    if (name !== undefined) {
      const { error } = await supabaseAdmin.from("profiles").upsert({ id: userId, name }, { onConflict: "id" });
      if (error) throw new Error(`Naam aanpassen mislukt: ${error.message}`);
    }

    if (membership !== undefined) {
      if (!["guest", "white_member", "black_member"].includes(membership)) {
        return NextResponse.json({ error: "Ongeldig lidmaatschap." }, { status: 400 });
      }
      const startsAt = body.membership_starts_at
        ? new Date(`${body.membership_starts_at}T00:00:00`).toISOString()
        : new Date().toISOString();
      if (Number.isNaN(new Date(startsAt).getTime())) {
        return NextResponse.json({ error: "Ongeldige startdatum." }, { status: 400 });
      }

      const { error: deactivateError } = await supabaseAdmin
        .from("user_memberships")
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("source", "admin_manual");
      if (deactivateError) throw new Error(`Handmatig lidmaatschap aanpassen mislukt: ${deactivateError.message}`);

      const { error: membershipError } = await supabaseAdmin.from("user_memberships").upsert({
        user_id: userId,
        membership_level_key: membership,
        source: "admin_manual",
        source_ref: "manual",
        starts_at: startsAt,
        expires_at: membership === "guest" ? null : undefined,
        active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,source,source_ref" });
      if (membershipError) throw new Error(`Lidmaatschap opslaan mislukt: ${membershipError.message}`);
    }

    return NextResponse.json({ success: true, message: "De gebruiker werd bijgewerkt." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAppAdmin(request);
    const { userId } = await context.params;
    await ensureTargetIsNotAdmin(userId);
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Gebruiker verwijderen mislukt: ${error.message}`);
    return NextResponse.json({ success: true, message: "De gebruiker en gekoppelde appgegevens werden volledig verwijderd." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: getStatus(message) });
  }
}
