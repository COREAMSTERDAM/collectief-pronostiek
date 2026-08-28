import { NextRequest, NextResponse } from "next/server";
import { fetchClubNewsFeed } from "@/src/lib/club-news";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return false;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Niet toegelaten." }, { status: 401 });
  }

  try {
    const items = await fetchClubNewsFeed();
    const supabaseAdmin = getSupabaseAdmin();

    if (items.length) {
      const { error } = await supabaseAdmin
        .from("club_news")
        .upsert(
          items.map((item) => ({
            ...item,
            imported_at: new Date().toISOString(),
          })),
          { onConflict: "source_url" },
        );

      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      checked: items.length,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Clubnieuws synchroniseren mislukt.",
      },
      { status: 500 },
    );
  }
}
