"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useReportWebVitals } from "next/web-vitals";
import {
  enqueueAnalytics,
  getAnalyticsSessionId,
  trackAnalyticsEvent,
} from "@/src/lib/analytics-client";

type CurrentView = {
  id: string;
  startedAt: number;
  activeMs: number;
  activeStartedAt: number | null;
  maxScroll: number;
  path: string;
};

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function displayMode() {
  if (window.matchMedia("(display-mode: standalone)").matches) return "standalone";
  if ((navigator as Navigator & { standalone?: boolean }).standalone) return "standalone";
  return "browser";
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const viewRef = useRef<CurrentView | null>(null);

  useReportWebVitals((metric) => {
    enqueueAnalytics({
      type: "web_vital",
      session_id: getAnalyticsSessionId(),
      path: `${location.pathname}${location.search}`.slice(0, 500),
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      metric_id: metric.id,
      navigation_type: metric.navigationType,
      occurred_at: new Date().toISOString(),
    });
  });

  useEffect(() => {
    function finishCurrent(immediate = true) {
      const view = viewRef.current;
      if (!view) return;
      const now = performance.now();
      if (view.activeStartedAt !== null) view.activeMs += now - view.activeStartedAt;
      enqueueAnalytics(
        {
          type: "page_leave",
          session_id: getAnalyticsSessionId(),
          view_id: view.id,
          path: view.path,
          ended_at: new Date().toISOString(),
          duration_ms: Math.max(0, Math.round(now - view.startedAt)),
          active_ms: Math.max(0, Math.round(view.activeMs)),
          max_scroll_pct: Math.max(0, Math.min(100, Math.round(view.maxScroll))),
        },
        immediate,
      );
      viewRef.current = null;
    }

    finishCurrent();

    const path = `${location.pathname}${location.search}`.slice(0, 500);
    const view: CurrentView = {
      id: uuid(),
      startedAt: performance.now(),
      activeMs: 0,
      activeStartedAt: document.visibilityState === "visible" && document.hasFocus() ? performance.now() : null,
      maxScroll: 0,
      path,
    };
    viewRef.current = view;

    enqueueAnalytics({
      type: "page_view",
      session_id: getAnalyticsSessionId(),
      view_id: view.id,
      path,
      title: document.title.slice(0, 200),
      referrer: document.referrer.slice(0, 500) || null,
      started_at: new Date().toISOString(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      display_mode: displayMode(),
      language: navigator.language,
    });

    function updateActive() {
      const current = viewRef.current;
      if (!current) return;
      const active = document.visibilityState === "visible" && document.hasFocus();
      const now = performance.now();
      if (active && current.activeStartedAt === null) current.activeStartedAt = now;
      if (!active && current.activeStartedAt !== null) {
        current.activeMs += now - current.activeStartedAt;
        current.activeStartedAt = null;
      }
    }

    function onScroll() {
      const current = viewRef.current;
      if (!current) return;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      current.maxScroll = Math.max(current.maxScroll, (window.scrollY / max) * 100);
    }

    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a,button,[role='button']") : null;
      if (!target) return;
      const label = (target.getAttribute("aria-label") || target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 160);
      const href = target instanceof HTMLAnchorElement ? target.href : target.getAttribute("data-href") || undefined;
      trackAnalyticsEvent("ui_click", {}, { category: "interaction", label, target: href });
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      trackAnalyticsEvent("form_submit", { form_id: form?.id || null, form_name: form?.getAttribute("name") || null }, { category: "conversion" });
    }

    function onError(event: ErrorEvent) {
      trackAnalyticsEvent(
        "client_error",
        { message: event.message, filename: event.filename, lineno: event.lineno, colno: event.colno },
        { category: "error", label: event.message, immediate: true },
      );
    }

    function onRejection(event: PromiseRejectionEvent) {
      const message = event.reason instanceof Error ? event.reason.message : String(event.reason ?? "Unhandled promise rejection");
      trackAnalyticsEvent("unhandled_rejection", { message }, { category: "error", label: message, immediate: true });
    }

    document.addEventListener("visibilitychange", updateActive);
    window.addEventListener("focus", updateActive);
    window.addEventListener("blur", updateActive);
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("pagehide", () => finishCurrent(true), { once: true });

    return () => {
      finishCurrent(true);
      document.removeEventListener("visibilitychange", updateActive);
      window.removeEventListener("focus", updateActive);
      window.removeEventListener("blur", updateActive);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);

  return null;
}
