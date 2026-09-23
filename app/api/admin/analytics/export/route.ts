import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const url = new URL(request.url);
    const kind = url.searchParams.get("type") || "pages";
    const days = Math.min(400, Math.max(1, Number(url.searchParams.get("days") || 30)));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const supabaseAdmin = getSupabaseAdmin();

    let rows: Record<string, unknown>[] = [];
    let headers: string[] = [];

    if (kind === "events") {
      const { data, error } = await supabaseAdmin
        .from("analytics_events")
        .select("occurred_at,user_id,session_key,event_name,category,path,label,target,metadata,is_admin")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(50000);
      if (error) throw new Error(error.message);
      rows = (data ?? []) as Record<string, unknown>[];
      headers = ["occurred_at","user_id","session_key","event_name","category","path","label","target","metadata","is_admin"];
    } else if (kind === "sessions") {
      const { data, error } = await supabaseAdmin
        .from("analytics_sessions")
        .select("started_at,last_seen_at,user_id,session_key,entry_path,exit_path,device_type,browser,os,display_mode,viewport_width,viewport_height,is_admin")
        .gte("last_seen_at", since)
        .order("last_seen_at", { ascending: false })
        .limit(50000);
      if (error) throw new Error(error.message);
      rows = (data ?? []) as Record<string, unknown>[];
      headers = ["started_at","last_seen_at","user_id","session_key","entry_path","exit_path","device_type","browser","os","display_mode","viewport_width","viewport_height","is_admin"];
    } else {
      const { data, error } = await supabaseAdmin
        .from("analytics_page_views")
        .select("started_at,ended_at,user_id,session_key,path,title,referrer,duration_ms,active_ms,max_scroll_pct,viewport_width,viewport_height,display_mode,is_admin")
        .gte("started_at", since)
        .order("started_at", { ascending: false })
        .limit(50000);
      if (error) throw new Error(error.message);
      rows = (data ?? []) as Record<string, unknown>[];
      headers = ["started_at","ended_at","user_id","session_key","path","title","referrer","duration_ms","active_ms","max_scroll_pct","viewport_width","viewport_height","display_mode","is_admin"];
    }

    const csv = [headers.map(csvCell).join(","), ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(","))].join("\n");
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="analytics-${kind}-${days}d.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Export mislukt." }, { status: 400 });
  }
}
