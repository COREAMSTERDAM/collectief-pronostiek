import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function getTrackingStart() {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from("club_news_read_tracking")
    .select("tracking_started_at")
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.tracking_started_at ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const supabaseAdmin = getSupabaseAdmin();
    const trackingStartedAt = await getTrackingStart();

    if (!trackingStartedAt) {
      return NextResponse.json({ unread_count: 0 });
    }

    const { data: newsRows, error: newsError } = await supabaseAdmin
      .from("club_news")
      .select("id")
      .gt("first_seen_at", trackingStartedAt);

    if (newsError) throw new Error(newsError.message);

    const newsIds = (newsRows ?? []).map((row) => Number(row.id));
    if (!newsIds.length) {
      return NextResponse.json({ unread_count: 0 });
    }

    const { data: readRows, error: readError } = await supabaseAdmin
      .from("club_news_reads")
      .select("news_id")
      .eq("user_id", user.id)
      .in("news_id", newsIds);

    if (readError) throw new Error(readError.message);

    const readIds = new Set((readRows ?? []).map((row) => Number(row.news_id)));
    const unreadCount = newsIds.filter((id) => !readIds.has(id)).length;

    return NextResponse.json({ unread_count: unreadCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ongelezen nieuws laden mislukt." },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = await request.json().catch(() => ({}));
    const newsId = Number(body?.news_id);

    if (!Number.isInteger(newsId) || newsId <= 0) {
      return NextResponse.json({ error: "Ongeldig nieuwsbericht." }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("club_news_reads")
      .upsert(
        {
          user_id: user.id,
          news_id: newsId,
          read_at: new Date().toISOString(),
        },
        { onConflict: "user_id,news_id" },
      );

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nieuws als gelezen markeren mislukt." },
      { status: 401 },
    );
  }
}
