import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);

    const supabaseAdmin = getSupabaseAdmin();
    const users: Array<{
      id: string;
      email: string;
      created_at: string;
    }> = [];

    let page = 1;

    while (true) {
      const { data, error } =
        await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (error) throw error;

      users.push(
        ...data.users.map((user) => ({
          id: user.id,
          email: user.email ?? "",
          created_at: user.created_at,
        })),
      );

      if (data.users.length < 1000) break;
      page += 1;
    }

    const userIds = users.map((user) => user.id);

    const [{ data: profiles, error: profileError }, { data: userRoles, error: roleError }] =
      await Promise.all([
        userIds.length
          ? supabaseAdmin
              .from("profiles")
              .select("id, name")
              .in("id", userIds)
          : Promise.resolve({ data: [], error: null }),
        userIds.length
          ? supabaseAdmin
              .from("community_user_roles")
              .select("user_id, role_id")
              .in("user_id", userIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (profileError) throw profileError;
    if (roleError) throw roleError;

    const names = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        profile.name,
      ]),
    );

    const roleIdsByUser = new Map<string, number[]>();

    for (const row of userRoles ?? []) {
      const current = roleIdsByUser.get(row.user_id) ?? [];
      current.push(Number(row.role_id));
      roleIdsByUser.set(row.user_id, current);
    }

    return NextResponse.json({
      users: users
        .map((user) => ({
          ...user,
          name: names.get(user.id) ?? null,
          role_ids: roleIdsByUser.get(user.id) ?? [],
        }))
        .sort((a, b) =>
          (a.name || a.email).localeCompare(
            b.name || b.email,
            "nl",
          ),
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gebruikers ophalen mislukt.",
      },
      { status: 403 },
    );
  }
}
