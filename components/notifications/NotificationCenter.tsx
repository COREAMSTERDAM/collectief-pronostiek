"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  archiveNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/src/lib/notifications/client";
import { supabase } from "@/src/lib/supabase";

function groupLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Vandaag";
  if (date.toDateString() === yesterday.toDateString()) return "Gisteren";

  return new Intl.DateTimeFormat("nl-BE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationCenter() {
  const [notifications, setNotifications] =
    useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setErrorMessage("");
      setNotifications(await getMyNotifications());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Meldingen laden mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("notification-center")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const groups = notifications.reduce<
    Record<string, AppNotification[]>
  >((result, notification) => {
    const key = groupLabel(notification.created_at);
    result[key] ??= [];
    result[key].push(notification);
    return result;
  }, {});

  if (loading) {
    return (
      <section className="ucl-card text-center">
        <p className="ucl-muted">Meldingen laden…</p>
      </section>
    );
  }

  return (
    <div>
      {errorMessage ? (
        <div className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
          {errorMessage}
        </div>
      ) : null}

      <div className="mb-5 flex justify-end">
        <button
          type="button"
          onClick={async () => {
            await markAllNotificationsRead();
            await load();
          }}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white/65"
        >
          Alles als gelezen
        </button>
      </div>

      {notifications.length === 0 ? (
        <section className="ucl-card text-center">
          <div className="text-4xl">🔔</div>
          <h2 className="mt-4 text-xl font-black">Geen meldingen</h2>
          <p className="mt-2 text-sm text-white/40">
            Nieuwe app- en communitymeldingen verschijnen hier.
          </p>
        </section>
      ) : (
        <div className="space-y-7">
          {Object.entries(groups).map(([label, items]) => (
            <section key={label}>
              <p className="mb-3 px-1 text-xs font-black uppercase tracking-[0.2em] text-white/35">
                {label}
              </p>

              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
                {items.map((notification, index) => (
                  <article
                    key={notification.id}
                    className={`relative p-4 ${
                      index > 0 ? "border-t border-white/10" : ""
                    } ${notification.is_read ? "opacity-60" : ""}`}
                  >
                    {!notification.is_read ? (
                      <span className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-green-400" />
                    ) : null}

                    <div className="flex gap-3 pl-2">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-xl">
                        {notification.icon ?? "🔔"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-black text-white">
                            {notification.title}
                          </h2>
                          <span className="shrink-0 text-[10px] font-semibold text-white/30">
                            {timeLabel(notification.created_at)}
                          </span>
                        </div>

                        <p className="mt-1 text-sm leading-6 text-white/55">
                          {notification.body}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {notification.deep_link ? (
                            <Link
                              href={notification.deep_link}
                              onClick={() =>
                                void markNotificationRead(notification.id)
                              }
                              className="rounded-xl bg-white px-3 py-2 text-xs font-black text-black"
                            >
                              Openen
                            </Link>
                          ) : null}

                          {!notification.is_read ? (
                            <button
                              type="button"
                              onClick={async () => {
                                await markNotificationRead(notification.id);
                                await load();
                              }}
                              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/55"
                            >
                              Gelezen
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={async () => {
                              await archiveNotification(notification.id);
                              await load();
                            }}
                            className="rounded-xl border border-red-300/15 bg-red-400/10 px-3 py-2 text-xs font-black text-red-200/75"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
