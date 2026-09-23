"use client";

import { supabase } from "@/src/lib/supabase";

type AnalyticsItem = {
  type: "page_view" | "page_leave" | "event" | "web_vital";
  [key: string]: unknown;
};

type SessionState = { id: string; lastActivity: number };

const STORAGE_KEY = "cwz_analytics_session_v1";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const queue: AnalyticsItem[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
}

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") return "server";
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const current = raw ? (JSON.parse(raw) as SessionState) : null;
    if (current?.id && now - Number(current.lastActivity || 0) < SESSION_TIMEOUT_MS) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id: current.id, lastActivity: now }));
      return current.id;
    }
  } catch {}
  const id = uuid();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ id, lastActivity: now }));
  return id;
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function flush() {
  flushTimer = null;
  if (!queue.length) return;
  const items = queue.splice(0, 40);
  const token = await getToken();
  if (!token) return;
  try {
    await fetch("/api/analytics/collect", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items }),
      keepalive: true,
    });
  } catch {
    if (queue.length < 100) queue.unshift(...items);
  }
}

export function enqueueAnalytics(item: AnalyticsItem, immediate = false) {
  queue.push(item);
  if (queue.length > 100) queue.splice(0, queue.length - 100);
  if (immediate) {
    void flush();
    return;
  }
  if (!flushTimer) flushTimer = setTimeout(() => void flush(), 2500);
}

export function trackAnalyticsEvent(
  eventName: string,
  metadata: Record<string, unknown> = {},
  options?: { category?: string; label?: string; target?: string; immediate?: boolean },
) {
  if (typeof window === "undefined") return;
  enqueueAnalytics(
    {
      type: "event",
      session_id: getAnalyticsSessionId(),
      event_name: eventName.slice(0, 80),
      category: (options?.category ?? "interaction").slice(0, 50),
      path: `${location.pathname}${location.search}`.slice(0, 500),
      label: options?.label?.slice(0, 160) ?? null,
      target: options?.target?.slice(0, 500) ?? null,
      metadata,
      occurred_at: new Date().toISOString(),
    },
    options?.immediate,
  );
}

export function flushAnalytics() {
  return flush();
}
