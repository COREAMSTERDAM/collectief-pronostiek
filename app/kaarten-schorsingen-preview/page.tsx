"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type CardRecord = {
  id: string;
  team_key: string;
  team_label: string;
  player_name: string;
  yellow_cards: number;
  second_yellow_red: number;
  red_cards: number;
  suspension_note: string | null;
};

type Payload = {
  records: CardRecord[];
  state: { last_success_at?: string | null; last_error?: string | null; records_count?: number } | null;
  sourceUrl: string;
};

export default function KaartenSchorsingenPreviewPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [team, setTeam] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function request(method: "GET" | "POST" = "GET") {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { router.replace("/login?reason=login-required"); return null; }
    const response = await fetch("/api/admin/football-cards", {
      method,
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Kaarten laden mislukt.");
    return json as Payload;
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const json = await request();
        if (!active || !json) return;
        setPayload(json);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Laden mislukt.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  const teams = useMemo(() => {
    const values = [...new Map<string, string>((payload?.records ?? []).map((row) => [row.team_key, row.team_label])).entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => {
        if (/eerste/i.test(a.label)) return -1;
        if (/eerste/i.test(b.label)) return 1;
        if (/reserven|beloften/i.test(a.label) && !/reserven|beloften/i.test(b.label)) return -1;
        if (/reserven|beloften/i.test(b.label) && !/reserven|beloften/i.test(a.label)) return 1;
        const ageA = Number(a.label.match(/U\s?(\d{1,2})/i)?.[1] ?? 0);
        const ageB = Number(b.label.match(/U\s?(\d{1,2})/i)?.[1] ?? 0);
        if (ageA && ageB && ageA !== ageB) return ageB - ageA;
        return a.label.localeCompare(b.label, "nl");
      });
    return values;
  }, [payload]);

  useEffect(() => {
    if (!team && teams.length) setTeam(teams[0].key);
  }, [team, teams]);

  const rows = useMemo(() => (payload?.records ?? []).filter((row) => !team || row.team_key === team), [payload, team]);

  async function syncNow() {
    setSyncing(true); setError("");
    try {
      const json = await request("POST");
      if (json) setPayload(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Synchroniseren mislukt.");
    } finally { setSyncing(false); }
  }



  return (
    <main className="football-cards-preview-page">
      <header className="football-cards-preview-header">
        <div><p>Admin preview · Club</p><h1>Kaarten & schorsingen</h1><span>Bron: Voetbal Vlaanderen</span></div>
        <div className="football-cards-preview-mark">🟨</div>
      </header>

      <section className="football-cards-preview-controls">
        <label><span>Ploeg</span>
          <select value={team} onChange={(event) => setTeam(event.target.value)} disabled={!teams.length}>
            {teams.length ? teams.map((item) => <option value={item.key} key={item.key}>{item.label}</option>) : <option>Geen ploegen geladen</option>}
          </select>
        </label>
        <button type="button" onClick={syncNow} disabled={syncing}>{syncing ? "Bijwerken…" : "Nu bijwerken"}</button>
      </section>

      {loading ? <div className="football-cards-preview-state">Kaarten laden…</div> : null}
      {error ? <div className="football-cards-preview-state is-error">{error}</div> : null}

      {!loading && !rows.length ? (
        <div className="football-cards-preview-state">
          Nog geen kaarten-data opgeslagen. Gebruik <strong>Nu bijwerken</strong> om de eerste synchronisatie te proberen.
        </div>
      ) : null}

      {rows.length ? <section className="football-cards-preview-list">
        {rows.map((row) => (
          <article key={row.id}>
            <div className="football-cards-preview-player"><strong>{row.player_name}</strong>{row.suspension_note ? <small>{row.suspension_note}</small> : null}</div>
            <div className="football-cards-preview-counts">
              <span title="Gele kaarten">🟨 <b>{row.yellow_cards}</b></span>
              {row.second_yellow_red ? <span title="Tweede geel / rood">🟨🟥 <b>{row.second_yellow_red}</b></span> : null}
              {row.red_cards ? <span title="Rode kaarten">🟥 <b>{row.red_cards}</b></span> : null}
            </div>
          </article>
        ))}
      </section> : null}

      <footer className="football-cards-preview-footer">
        <span>{payload?.state?.last_success_at ? `Laatste succesvolle update: ${new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payload.state.last_success_at))}` : "Nog niet gesynchroniseerd"}</span>
        <a href={payload?.sourceUrl ?? "https://www.voetbalvlaanderen.be/club/1676/kaarten"} target="_blank" rel="noreferrer">Open bron ↗</a>
      </footer>
    </main>
  );
}
