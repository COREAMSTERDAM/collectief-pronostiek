import "server-only";

import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export async function requireAuthenticatedUser(
  request: NextRequest,
) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("Niet aangemeld.");
  }

  const accessToken = authorization
    .slice("Bearer ".length)
    .trim();

  if (!accessToken) {
    throw new Error("Ongeldige sessie.");
  }

  const supabaseAdmin = getSupabaseAdmin();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    throw new Error("Ongeldige of verlopen sessie.");
  }

  return user;
}
