import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStatus(message: string) {
  if (message.includes("beheerdersrechten")) return 403;
  if (
    message.includes("aangemeld") ||
    message.includes("sessie")
  ) {
    return 401;
  }
  if (message.includes("omgevingsvariabelen")) return 500;
  return 500;
}

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);

    const supabaseAdmin = getSupabaseAdmin();

    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") ?? 1),
    );

    const perPage = Math.min(
      100,
      Math.max(
        1,
        Number(request.nextUrl.searchParams.get("perPage") ?? 100),
      ),
    );

    const {
      data: { users },
      error: usersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (usersError) {
      throw new Error(
        `Gebruikers ophalen mislukt: ${usersError.message}`,
      );
    }

    const userIds = users.map((user) => user.id);

    const { data: profiles, error: profilesError } =
      userIds.length === 0
        ? { data: [], error: null }
        : await supabaseAdmin
            .from("profiles")
            .select("id, name, is_admin, avatar_url")
            .in("id", userIds);

    if (profilesError) {
      throw new Error(
        `Profielen ophalen mislukt: ${profilesError.message}`,
      );
    }

    const profilesById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile]),
    );

    return NextResponse.json({
      users: users.map((user) => {
        const profile = profilesById.get(user.id);

        return {
          id: user.id,
          email: user.email ?? "",
          name: profile?.name ?? "",
          is_admin: Boolean(profile?.is_admin),
          avatar_url: profile?.avatar_url ?? null,
          email_confirmed_at: user.email_confirmed_at ?? null,
          last_sign_in_at: user.last_sign_in_at ?? null,
          created_at: user.created_at,
        };
      }),
      page,
      perPage,
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
