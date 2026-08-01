import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

function getStatus(message: string) {
  if (message.includes("administrator")) return 403;
  if (message.includes("beheerdersrechten")) return 403;
  if (
    message.includes("aangemeld") ||
    message.includes("sessie")
  ) {
    return 401;
  }
  return 500;
}

async function ensureTargetIsNotAdmin(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Doelaccount controleren mislukt: ${error.message}`,
    );
  }

  if (profile?.is_admin) {
    throw new Error(
      "Voor administrators kan geen wachtwoord-reset worden verstuurd door een andere administrator.",
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    await requireAppAdmin(request);

    const { userId } = await context.params;
    await ensureTargetIsNotAdmin(userId);

    const supabaseAdmin = getSupabaseAdmin();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !user) {
      throw new Error(
        userError?.message ?? "De gebruiker werd niet gevonden.",
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          error:
            "Deze gebruiker heeft geen e-mailadres voor een resetmail.",
        },
        { status: 400 },
      );
    }

    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
      request.nextUrl.origin;

    const { error: resetError } =
      await supabaseAdmin.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${origin}/wachtwoord-resetten`,
      });

    if (resetError) {
      throw new Error(
        `Resetmail versturen mislukt: ${resetError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: `Resetmail verstuurd naar ${user.email}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Onbekende fout";

    return NextResponse.json(
      { error: message },
      { status: getStatus(message) },
    );
  }
}
