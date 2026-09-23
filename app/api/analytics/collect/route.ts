import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function str(value: unknown, max = 500) {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function num(value: unknown, min = 0, max = 86_400_000) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : null;
}

function deviceType(width: number | null) {
  if (!width) return "unknown";
  if (width < 768) return "mobile";
  if (width < 1100) return "tablet";
  return "desktop";
}

function parseUserAgent(ua: string) {
  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua)) browser = "Opera";
  else if (/CriOS|Chrome\//i.test(ua)) browser = "Chrome";
  else if (/FxiOS|Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  let os = "Other";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  return { browser, os };
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return new NextResponse(null, { status: 204 });
    const accessToken = authorization.slice(7).trim();
    if (!accessToken) return new NextResponse(null, { status: 204 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: authData } = await supabaseAdmin.auth.getUser(accessToken);
    const user = authData.user;
    if (!user) return new NextResponse(null, { status: 204 });

    const body = await request.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items.slice(0, 50) : [];
    if (!items.length) return NextResponse.json({ ok: true });

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const userAgent = request.headers.get("user-agent") || "";
    const parsedUa = parseUserAgent(userAgent);
    const first = items[0] as Record<string, unknown>;
    const sessionId = str(first.session_id, 100);
    if (!sessionId) return NextResponse.json({ ok: true });

    const pageView = items.find((item: Record<string, unknown>) => item.type === "page_view") as Record<string, unknown> | undefined;
    const viewportWidth = num(pageView?.viewport_width, 0, 10000);
    await supabaseAdmin.rpc("touch_analytics_session", {
      p_session_key: sessionId,
      p_user_id: user.id,
      p_is_admin: profile?.is_admin === true,
      p_entry_path: str(pageView?.path, 500),
      p_exit_path: str((items[items.length - 1] as Record<string, unknown>)?.path, 500),
      p_device_type: deviceType(viewportWidth),
      p_browser: parsedUa.browser,
      p_os: parsedUa.os,
      p_display_mode: str(pageView?.display_mode, 30),
      p_viewport_width: viewportWidth,
      p_viewport_height: num(pageView?.viewport_height, 0, 10000),
      p_language: str(pageView?.language, 20),
    });

    const pageRows = items
      .filter((item: Record<string, unknown>) => item.type === "page_view")
      .map((item: Record<string, unknown>) => ({
        id: str(item.view_id, 100),
        session_key: str(item.session_id, 100),
        user_id: user.id,
        is_admin: profile?.is_admin === true,
        path: str(item.path, 500) || "/",
        title: str(item.title, 200),
        referrer: str(item.referrer, 500),
        started_at: str(item.started_at, 50) || new Date().toISOString(),
        viewport_width: num(item.viewport_width, 0, 10000),
        viewport_height: num(item.viewport_height, 0, 10000),
        screen_width: num(item.screen_width, 0, 20000),
        screen_height: num(item.screen_height, 0, 20000),
        display_mode: str(item.display_mode, 30),
      }))
      .filter((row: { id: string; session_key: string }) => row.id && row.session_key);

    if (pageRows.length) {
      await supabaseAdmin.from("analytics_page_views").upsert(pageRows, { onConflict: "id" });
    }

    for (const item of items.filter((value: Record<string, unknown>) => value.type === "page_leave") as Record<string, unknown>[]) {
      const viewId = str(item.view_id, 100);
      if (!viewId) continue;
      await supabaseAdmin
        .from("analytics_page_views")
        .update({
          ended_at: str(item.ended_at, 50) || new Date().toISOString(),
          duration_ms: num(item.duration_ms),
          active_ms: num(item.active_ms),
          max_scroll_pct: num(item.max_scroll_pct, 0, 100),
        })
        .eq("id", viewId)
        .eq("user_id", user.id);
    }

    const eventRows = items
      .filter((item: Record<string, unknown>) => item.type === "event")
      .map((item: Record<string, unknown>) => ({
        session_key: str(item.session_id, 100),
        user_id: user.id,
        is_admin: profile?.is_admin === true,
        event_name: str(item.event_name, 80) || "event",
        category: str(item.category, 50),
        path: str(item.path, 500),
        label: str(item.label, 160),
        target: str(item.target, 500),
        metadata: typeof item.metadata === "object" && item.metadata !== null ? item.metadata : {},
        occurred_at: str(item.occurred_at, 50) || new Date().toISOString(),
      }));
    if (eventRows.length) await supabaseAdmin.from("analytics_events").insert(eventRows);

    const vitalRows = items
      .filter((item: Record<string, unknown>) => item.type === "web_vital")
      .map((item: Record<string, unknown>) => ({
        session_key: str(item.session_id, 100),
        user_id: user.id,
        is_admin: profile?.is_admin === true,
        path: str(item.path, 500),
        name: str(item.name, 20) || "unknown",
        value: num(item.value, -100000, 1000000),
        rating: str(item.rating, 20),
        metric_id: str(item.metric_id, 120),
        navigation_type: str(item.navigation_type, 50),
        occurred_at: str(item.occurred_at, 50) || new Date().toISOString(),
      }));
    if (vitalRows.length) await supabaseAdmin.from("analytics_web_vitals").insert(vitalRows);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("analytics collect failed", error);
    return new NextResponse(null, { status: 204 });
  }
}
