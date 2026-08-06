"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Role = {
  id: number;
  name: string;
};

type NotificationType = {
  code: string;
  name: string;
  description: string | null;
  icon: string;
  default_priority: "low" | "normal" | "high" | "urgent";
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Niet aangemeld.");
  }

  return session.access_token;
}

export default function AdminNotificationBroadcast() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [types, setTypes] =
    useState<NotificationType[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] =
    useState<number[]>([]);
  const [typeCode, setTypeCode] =
    useState("system_announcement");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState("📢");
  const [deepLink, setDeepLink] =
    useState("/meldingen");
  const [priority, setPriority] =
    useState<"low" | "normal" | "high" | "urgent">(
      "normal",
    );
  const [sendPush, setSendPush] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] =
    useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const token = await getAccessToken();

        const response = await fetch(
          "/api/admin/notifications/broadcast",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const payload = (await response.json()) as {
          roles?: Role[];
          types?: NotificationType[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "Broadcastgegevens laden mislukt.",
          );
        }

        if (mounted) {
          setRoles(payload.roles ?? []);
          setTypes(payload.types ?? []);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Broadcastgegevens laden mislukt.",
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

  async function submit(event: FormEvent) {
    event.preventDefault();

    try {
      setSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const token = await getAccessToken();

      const response = await fetch(
        "/api/admin/notifications/broadcast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            body,
            typeCode,
            icon,
            deepLink,
            priority,
            roleIds: selectedRoleIds,
            sendPush,
          }),
        },
      );

      const payload = (await response.json()) as {
        error?: string;
        recipients?: number;
        sent?: number;
        failed?: number;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Broadcast versturen mislukt.",
        );
      }

      setSuccessMessage(
        `Melding aangemaakt voor ${
          payload.recipients ?? 0
        } gebruikers. ${
          payload.sent ?? 0
        } pushmeldingen verstuurd${
          payload.failed
            ? `, ${payload.failed} mislukt`
            : ""
        }.`,
      );

      setTitle("");
      setBody("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Broadcast versturen mislukt.",
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <section className="ucl-card text-center">
        <p className="ucl-muted">
          Broadcastmodule laden…
        </p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {errorMessage ? (
        <div className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
          {successMessage}
        </div>
      ) : null}

      <section className="ucl-card">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
          Inhoud
        </p>

        <div className="mt-4 grid gap-4">
          <label>
            <span className="mb-2 block text-sm font-black text-white/70">
              Titel
            </span>
            <input
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              maxLength={120}
              required
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white outline-none focus:border-green-400/40"
              placeholder="Nieuwe mededeling"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-black text-white/70">
              Bericht
            </span>
            <textarea
              value={body}
              onChange={(event) =>
                setBody(event.target.value)
              }
              maxLength={1000}
              required
              rows={5}
              className="w-full resize-y rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white outline-none focus:border-green-400/40"
              placeholder="Schrijf hier je melding…"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-2 block text-sm font-black text-white/70">
                Type
              </span>
              <select
                value={typeCode}
                onChange={(event) => {
                  const next = event.target.value;
                  setTypeCode(next);

                  const selected = types.find(
                    (item) => item.code === next,
                  );

                  if (selected) {
                    setIcon(selected.icon);
                    setPriority(
                      selected.default_priority,
                    );
                  }
                }}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white"
              >
                {types.map((type) => (
                  <option
                    key={type.code}
                    value={type.code}
                  >
                    {type.icon} {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-white/70">
                Prioriteit
              </span>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value as typeof priority,
                  )
                }
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white"
              >
                <option value="low">Laag</option>
                <option value="normal">Normaal</option>
                <option value="high">Hoog</option>
                <option value="urgent">Dringend</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <label>
              <span className="mb-2 block text-sm font-black text-white/70">
                Icoon
              </span>
              <input
                value={icon}
                onChange={(event) =>
                  setIcon(event.target.value)
                }
                maxLength={16}
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white"
              />
            </label>

            <label>
              <span className="mb-2 block text-sm font-black text-white/70">
                Link
              </span>
              <input
                value={deepLink}
                onChange={(event) =>
                  setDeepLink(event.target.value)
                }
                className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-base text-white"
                placeholder="/meldingen"
              />
            </label>
          </div>
        </div>
      </section>

      <section className="ucl-card">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
          Ontvangers
        </p>

        <h2 className="mt-2 text-xl font-black text-white">
          Rollen
        </h2>

        <p className="mt-2 text-sm text-white/40">
          Kies geen rol om de melding naar alle gebruikers te sturen.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {roles.map((role) => {
            const selected =
              selectedRoleIds.includes(role.id);

            return (
              <button
                key={role.id}
                type="button"
                onClick={() =>
                  setSelectedRoleIds((current) =>
                    selected
                      ? current.filter(
                          (id) => id !== role.id,
                        )
                      : [...current, role.id],
                  )
                }
                className={`rounded-2xl border px-4 py-3 text-left text-sm font-black ${
                  selected
                    ? "border-green-300/30 bg-green-400/10 text-green-100"
                    : "border-white/10 bg-black/20 text-white/55"
                }`}
              >
                {selected ? "✓ " : ""}
                {role.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSelectedRoleIds([])}
          className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-white/45"
        >
          Alle gebruikers
        </button>
      </section>

      <section className="ucl-card">
        <label className="flex items-center justify-between gap-4">
          <div>
            <p className="font-black text-white">
              Pushmelding versturen
            </p>
            <p className="mt-1 text-sm text-white/40">
              De melding verschijnt altijd in het Notification Center.
            </p>
          </div>

          <input
            type="checkbox"
            checked={sendPush}
            onChange={(event) =>
              setSendPush(event.target.checked)
            }
            className="h-6 w-6 accent-green-500"
          />
        </label>
      </section>

      <button
        type="submit"
        disabled={
          sending || !title.trim() || !body.trim()
        }
        className="ucl-button-primary w-full disabled:opacity-40"
      >
        {sending
          ? "Melding versturen…"
          : "🔔 Melding versturen"}
      </button>
    </form>
  );
}
