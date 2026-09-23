"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type PlayerStat = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  active: boolean;
  goals: number;
  yellow_cards: number;
  second_yellow_red: boolean;
  suspension_served: boolean;
  yellow_suspension_served_at: number;
  second_yellow_suspension_served: boolean;
};

export default function AdminSpelersstatistiekenPage() {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        window.location.href = "/login?reason=login-required";
        return;
      }
      const response = await fetch("/api/admin/player-stats", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Laden mislukt.");
      setPlayers((json.players ?? []).map((player: PlayerStat) => ({
        ...player,
        goals: Number(player.goals ?? 0),
        yellow_cards: Number(player.yellow_cards ?? 0),
        second_yellow_red: Boolean(player.second_yellow_red),
        suspension_served: Boolean(player.suspension_served),
        yellow_suspension_served_at: Number(player.yellow_suspension_served_at ?? 0),
        second_yellow_suspension_served: Boolean(player.second_yellow_suspension_served),
      })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function change(id: number, field: "goals" | "yellow_cards", delta: number) {
    setPlayers((current) => current.map((player) => {
      if (player.id !== id) return player;
      const nextValue = Math.max(0, Number(player[field] ?? 0) + delta);
      if (field === "yellow_cards") {
        const maxServedThreshold = Math.floor(nextValue / 3) * 3;
        return {
          ...player,
          yellow_cards: nextValue,
          yellow_suspension_served_at: Math.min(player.yellow_suspension_served_at, maxServedThreshold),
        };
      }
      return { ...player, [field]: nextValue };
    }));
    setMessage("");
  }

  function setCount(id: number, field: "goals" | "yellow_cards", value: string) {
    const parsed = Math.max(0, Math.min(999, Number.parseInt(value || "0", 10) || 0));
    setPlayers((current) => current.map((player) => {
      if (player.id !== id) return player;
      if (field === "yellow_cards") {
        const maxServedThreshold = Math.floor(parsed / 3) * 3;
        return {
          ...player,
          yellow_cards: parsed,
          yellow_suspension_served_at: Math.min(player.yellow_suspension_served_at, maxServedThreshold),
        };
      }
      return { ...player, [field]: parsed };
    }));
    setMessage("");
  }

  async function saveAll() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const token = await getToken();
      if (!token) throw new Error("Je sessie is verlopen.");
      const response = await fetch("/api/admin/player-stats", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          updates: players.map((player) => ({
            id: player.id,
            goals: player.goals,
            yellow_cards: player.yellow_cards,
            second_yellow_red: player.second_yellow_red,
            suspension_served: player.suspension_served,
            yellow_suspension_served_at: player.yellow_suspension_served_at,
            second_yellow_suspension_served: player.second_yellow_suspension_served,
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Opslaan mislukt.");
      setMessage("Spelersstatistieken opgeslagen.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  function markSuspensionServed(id: number) {
    setPlayers((current) => current.map((player) => {
      if (player.id !== id) return player;
      const yellowThreshold = Math.floor(player.yellow_cards / 3) * 3;
      return {
        ...player,
        yellow_suspension_served_at: Math.max(player.yellow_suspension_served_at, yellowThreshold),
        second_yellow_suspension_served: player.second_yellow_red ? true : player.second_yellow_suspension_served,
      };
    }));
    setMessage("Schorsing als afgewerkt gemarkeerd. Klik op Alles opslaan om te bewaren.");
  }

  const suspended = useMemo(() => players.filter((player) => {
    const yellowThreshold = Math.floor(player.yellow_cards / 3) * 3;
    const yellowPending = yellowThreshold >= 3 && player.yellow_suspension_served_at < yellowThreshold;
    const redPending = player.second_yellow_red && !player.second_yellow_suspension_served;
    return yellowPending || redPending;
  }), [players]);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-5xl">
        <header className="mb-6">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Admin</p>
          <h1 className="ucl-title">📊 Spelersstatistieken</h1>
          <p className="ucl-subtitle">Hou doelpunten en kaarten zelf bij. Een speler is automatisch geschorst bij elke veelvoud van 3 gele kaarten (3, 6, 9, …) of na 2x geel (rood) in één wedstrijd.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/spelers" className="ucl-button-secondary">← Spelersbeheer</Link>
            <button type="button" onClick={saveAll} disabled={saving || loading} className="ucl-button-primary disabled:opacity-50">
              {saving ? "Opslaan…" : "Alles opslaan"}
            </button>
          </div>
        </header>

        {error ? <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 font-bold text-rose-200">{error}</div> : null}
        {message ? <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 font-bold text-emerald-200">{message}</div> : null}

        {!loading && suspended.length ? (
          <section className="ucl-card mb-5 !p-4 sm:!p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Geschorsten volgende wedstrijd</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suspended.map((player) => (
                <div key={player.id} className="flex items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-3 py-2">
                  <span className="text-sm font-black text-amber-100">
                    {player.name} · {player.second_yellow_red && !player.second_yellow_suspension_served ? "2x geel → rood" : `${Math.floor(player.yellow_cards / 3) * 3} 🟨`}
                  </span>
                  <button
                    type="button"
                    onClick={() => markSuspensionServed(player.id)}
                    className="rounded-xl border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-black text-white hover:bg-black/50"
                  >
                    Schorsing afgewerkt
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="ucl-card !p-0 overflow-hidden">
          {loading ? <p className="p-5 ucl-muted">Spelers laden…</p> : null}
          {!loading && !players.length ? <p className="p-5 ucl-muted">Geen actieve spelers gevonden.</p> : null}
          {players.map((player) => (
            <article key={player.id} className="border-b border-white/10 p-4 last:border-b-0 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {player.shirt_number ? <span className="text-sm font-black text-white/40">#{player.shirt_number}</span> : null}
                    <strong className="truncate text-base font-black text-white">{player.name}</strong>
                    {(((Math.floor(player.yellow_cards / 3) * 3) >= 3 && player.yellow_suspension_served_at < Math.floor(player.yellow_cards / 3) * 3) || (player.second_yellow_red && !player.second_yellow_suspension_served)) ? <span className="rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-200">Geschorst</span> : null}
                  </div>
                  <span className="text-xs font-semibold text-white/35">{player.position ?? "Speler"}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:w-[520px] sm:grid-cols-3">
                  <Counter label="Doelpunten" value={player.goals} icon="⚽" onMinus={() => change(player.id, "goals", -1)} onPlus={() => change(player.id, "goals", 1)} onChange={(value) => setCount(player.id, "goals", value)} />
                  <Counter label="Gele kaarten" value={player.yellow_cards} icon="🟨" onMinus={() => change(player.id, "yellow_cards", -1)} onPlus={() => change(player.id, "yellow_cards", 1)} onChange={(value) => setCount(player.id, "yellow_cards", value)} />
                  <label className={`rounded-2xl border p-3 ${player.second_yellow_red ? "border-rose-400/40 bg-rose-500/10" : "border-white/10 bg-black/20"}`}>
                    <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-white/40">🟨🟨→🟥 2x geel</span>
                    <div className="flex h-9 items-center justify-between gap-3">
                      <span className="text-xs font-bold text-white/70">Volgende match geschorst</span>
                      <input
                        type="checkbox"
                        checked={player.second_yellow_red}
                        onChange={(event) => {
                          setPlayers((current) => current.map((item) => item.id === player.id ? { ...item, second_yellow_red: event.target.checked, second_yellow_suspension_served: event.target.checked ? false : false } : item));
                          setMessage("");
                        }}
                        className="h-5 w-5 accent-rose-500"
                        aria-label={`${player.name} 2x geel rood`}
                      />
                    </div>
                  </label>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

function Counter({ label, value, icon, onMinus, onPlus, onChange }: { label: string; value: number; icon: string; onMinus: () => void; onPlus: () => void; onChange: (value: string) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-white/40">{icon} {label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onMinus} className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-lg font-black text-white">−</button>
        <input aria-label={label} inputMode="numeric" min={0} max={999} type="number" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-2 text-center font-black text-white outline-none" />
        <button type="button" onClick={onPlus} className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-lg font-black text-white">+</button>
      </div>
    </div>
  );
}
