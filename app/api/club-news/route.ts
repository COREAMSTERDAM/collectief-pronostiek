import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export async function GET(request: NextRequest) {
  try {
    await requireAuthenticatedUser(request);
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
