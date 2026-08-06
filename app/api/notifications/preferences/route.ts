import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin.rpc(
      "get_my_notification_preferences",
    );

    if (error) throw error;

    return NextResponse.json({
      preferences: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Meldingsvoorkeuren ophalen mislukt.",
      },
      { status: 401 },
    );
  }
}
