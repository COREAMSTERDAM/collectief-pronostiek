import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";

function resolveRange(range: string | null) {
  const now = new Date();
  const to = new Date(now);
  let from = new Date(now);
  switch (range) {
    case "today":
      from.setHours(0, 0, 0, 0);
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 86400000);
      break;
    case "season":
      from = new Date(now.getFullYear(), 6, 1);
      if (now.getMonth() < 6) from = new Date(now.getFullYear() - 1, 6, 1);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 86400000);
      break;
    default:
      from = new Date(now.getTime() - 30 * 86400000);
  }
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const includeAdmin = searchParams.get("includeAdmin") === "1";
    const customFrom = searchParams.get("from");
    const customTo = searchParams.get("to");
    let { from, to } = resolveRange(range);
    if (customFrom && !Number.isNaN(Date.parse(customFrom))) from = new Date(customFrom);
    if (customTo && !Number.isNaN(Date.parse(customTo))) to = new Date(customTo);

    const supabaseAdmin = getSupabaseAdmin();
    const periodMs = Math.max(86400000, to.getTime() - from.getTime());
    const previousFrom = new Date(from.getTime() - periodMs);
    const previousTo = new Date(from);

    const [currentResult, previousResult] = await Promise.all([
      supabaseAdmin.rpc("get_analytics_dashboard", {
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_include_admin: includeAdmin,
      }),
      supabaseAdmin.rpc("get_analytics_dashboard", {
        p_from: previousFrom.toISOString(),
        p_to: previousTo.toISOString(),
        p_include_admin: includeAdmin,
      }),
    ]);
    if (currentResult.error) throw new Error(currentResult.error.message);
    if (previousResult.error) throw new Error(previousResult.error.message);

    return NextResponse.json({
      range,
      from: from.toISOString(),
      to: to.toISOString(),
      includeAdmin,
      dashboard: currentResult.data ?? {},
      previousKpis: (previousResult.data as { kpis?: unknown } | null)?.kpis ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analytics laden mislukt." },
      { status: 400 },
    );
  }
}
