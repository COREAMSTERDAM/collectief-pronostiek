"use client";

import { useEffect, useState } from "react";
import {
  getNotificationPreferences,
  setNotificationPreference,
  type NotificationPreference,
} from "@/src/lib/notifications/preferences";

export default function NotificationPreferences() {
  const [preferences, setPreferences] =
    useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const result = await getNotificationPreferences();
        if (mounted) setPreferences(result);
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Voorkeuren laden mislukt.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  async function update(
    typeCode: string,
    changes: Partial<
      Pick<
        NotificationPreference,
        "in_app_enabled" | "push_enabled"
      >
    >,
  ) {
    const current = preferences.find(
      (item) => item.type_code === typeCode,
    );

    if (!current) return;

    const next = {
      ...current,
      ...changes,
    };

    setPreferences((items) =>
      items.map((item) =>
        item.type_code === typeCode ? next : item,
      ),
    );

    try {
      await setNotificationPreference({
        typeCode,
        inAppEnabled: next.in_app_enabled,
        pushEnabled: next.push_enabled,
      });
    } catch (error) {
      setPreferences((items) =>
        items.map((item) =>
          item.type_code === typeCode ? current : item,
        ),
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Voorkeur opslaan mislukt.",
      );
    }
  }

  if (loading) {
    return (
      <section className="ucl-card text-center">
        <p className="ucl-muted">
          Meldingsvoorkeuren laden…
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {preferences.map((preference) => (
        <section
          key={preference.type_code}
          className="ucl-card"
        >
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25 text-xl">
              {preference.icon}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-black text-white">
                {preference.name}
              </h2>

              {preference.description ? (
                <p className="mt-1 text-sm leading-6 text-white/40">
                  {preference.description}
                </p>
              ) : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    void update(preference.type_code, {
                      in_app_enabled:
                        !preference.in_app_enabled,
                    })
                  }
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    preference.in_app_enabled
                      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/35"
                  }`}
                >
                  In app:{" "}
                  {preference.in_app_enabled
                    ? "aan"
                    : "uit"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void update(preference.type_code, {
                      push_enabled:
                        !preference.push_enabled,
                    })
                  }
                  className={`rounded-2xl border px-4 py-3 text-sm font-black ${
                    preference.push_enabled
                      ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
                      : "border-white/10 bg-white/5 text-white/35"
                  }`}
                >
                  Push:{" "}
                  {preference.push_enabled
                    ? "aan"
                    : "uit"}
                </button>
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
