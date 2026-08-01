import "server-only";
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

export async function requireAppAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Niet aangemeld.");
  }

  const accessToken = authorization.slice("Bearer ".length).trim();

  if (!accessToken) {
    throw new Error("Ongeldige sessie.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Ongeldige of verlopen sessie.");
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(
      `Adminrechten controleren mislukt: ${profileError.message}`,
    );
  }

  if (!profile?.is_admin) {
    throw new Error("Je hebt geen beheerdersrechten.");
  }

  return user;
}
