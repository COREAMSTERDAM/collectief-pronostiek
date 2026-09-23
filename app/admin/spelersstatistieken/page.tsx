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
      })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Laden mislukt.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function change(id: number, field: "goals" | "yellow_cards", delta: number) {
    setPlayers((current) => current.map((player) =>
      player.id === id
        ? { ...player, [field]: Math.max(0, Number(player[field] ?? 0) + delta) }
        : player,
    ));
    setMessage("");
  }

  function setCount(id: number, field: "goals" | "yellow_cards", value: string) {
    const parsed = Math.max(0, Math.min(999, Number.parseInt(value || "0", 10) || 0));
    setPlayers((current) => current.map((player) =>
      player.id === id ? { ...player, [field]: parsed } : player,
    ));
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

  const suspended = useMemo(() => players.filter((player) => player.yellow_cards >= 3), [players]);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-5xl">
        <header className="mb-6">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Admin</p>
          <h1 className="ucl-title">📊 Spelersstatistieken</h1>
          <p className="ucl-subtitle">Hou doelpunten en gele kaarten zelf bij. Vanaf 3 gele kaarten wordt een speler automatisch als geschorst aangeduid.</p>
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
                <span key={player.id} className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-100">
                  {player.name} · {player.yellow_cards} 🟨
                </span>
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
                    {player.yellow_cards >= 3 ? <span className="rounded-full bg-rose-500/15 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-rose-200">Geschorst</span> : null}
                  </div>
                  <span className="text-xs font-semibold text-white/35">{player.position ?? "Speler"}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:w-[360px]">
                  <Counter label="Doelpunten" value={player.goals} icon="⚽" onMinus={() => change(player.id, "goals", -1)} onPlus={() => change(player.id, "goals", 1)} onChange={(value) => setCount(player.id, "goals", value)} />
                  <Counter label="Gele kaarten" value={player.yellow_cards} icon="🟨" onMinus={() => change(player.id, "yellow_cards", -1)} onPlus={() => change(player.id, "yellow_cards", 1)} onChange={(value) => setCount(player.id, "yellow_cards", value)} />
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
