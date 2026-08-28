import { NextRequest, NextResponse } from "next/server";
import { fetchAllClubNewsSources } from "@/src/lib/club-news";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("club_news")
      .select("id, source, title, excerpt, category, image_url, source_url, published_at, imported_at, matched_keyword")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(200);

    if (error) throw new Error(error.message);
    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 403 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const result = await fetchAllClubNewsSources();
    const supabaseAdmin = getSupabaseAdmin();

    if (result.items.length) {
      const { error } = await supabaseAdmin
        .from("club_news")
        .upsert(
          result.items.map((item) => ({
            ...item,
            imported_at: new Date().toISOString(),
          })),
          { onConflict: "source_url" },
        );
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({
      ok: true,
      imported: result.items.length,
      counts: result.counts,
      source_errors: result.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onbekende fout." },
      { status: 403 },
    );
  }
}
