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

type UpdateUserBody = {
  name?: string;
  email?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getStatus(message: string) {
  if (message.includes("Administrators kunnen niet")) return 403;
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
      "Administrators kunnen niet door andere administrators worden gewijzigd.",
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    await requireAppAdmin(request);

    const { userId } = await context.params;
    await ensureTargetIsNotAdmin(userId);

    const supabaseAdmin = getSupabaseAdmin();
    const body = (await request.json()) as UpdateUserBody;

    const name =
      typeof body.name === "string" ? body.name.trim() : undefined;

    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : undefined;

    if (name === undefined && email === undefined) {
      return NextResponse.json(
        { error: "Er zijn geen wijzigingen opgegeven." },
        { status: 400 },
      );
    }

    if (email !== undefined && !email.includes("@")) {
      return NextResponse.json(
        { error: "Het e-mailadres is niet geldig." },
        { status: 400 },
      );
    }

    if (email !== undefined) {
      const { error: authError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email,
          email_confirm: true,
        });

      if (authError) {
        throw new Error(
          `E-mailadres aanpassen mislukt: ${authError.message}`,
        );
      }
    }

    if (name !== undefined) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .upsert(
          {
            id: userId,
            name,
          },
          {
            onConflict: "id",
          },
        );

      if (profileError) {
        throw new Error(
          `Naam aanpassen mislukt: ${profileError.message}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "De gebruiker werd bijgewerkt.",
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
