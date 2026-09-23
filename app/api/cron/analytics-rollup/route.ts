import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret || request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    for (const day of [yesterday, today]) {
      const { error } = await supabaseAdmin.rpc("refresh_analytics_daily_rollup", { p_day: day });
      if (error) throw new Error(error.message);
    }
    const { error: purgeError } = await supabaseAdmin.rpc("purge_old_analytics", { p_raw_days: 400, p_rollup_days: 800 });
    if (purgeError) throw new Error(purgeError.message);
    return NextResponse.json({ ok: true, rolledUp: [yesterday, today] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Rollup mislukt." }, { status: 500 });
  }
}
