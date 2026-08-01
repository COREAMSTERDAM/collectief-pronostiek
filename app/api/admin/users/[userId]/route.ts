import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { supabaseAdmin } from "@/src/lib/supabase-admin";

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

async function ensureTargetIsNotAdmin(userId: string) {
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

    // Server-side bescherming: ook rechtstreekse API-calls worden geblokkeerd.
    await ensureTargetIsNotAdmin(userId);

    const body = (await request.json()) as UpdateUserBody;

    const name =
      typeof body.name === "string" ? body.name.trim() : undefined;
    const email =
      typeof body.email === "string"
        ? normalizeEmail(body.email)
        : undefined;

    if (!name && !email) {
      return NextResponse.json(
        { error: "Er zijn geen wijzigingen opgegeven." },
        { status: 400 },
      );
    }

    if (email && !email.includes("@")) {
      return NextResponse.json(
        { error: "Het e-mailadres is niet geldig." },
        { status: 400 },
      );
    }

    if (email) {
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

    if (name) {
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

    const status =
      message.includes("Administrators kunnen niet") ? 403 :
      message.includes("beheerdersrechten") ? 403 :
      message.includes("aangemeld") ||
      message.includes("sessie") ? 401 :
      500;

    return NextResponse.json({ error: message }, { status });
  }
}
