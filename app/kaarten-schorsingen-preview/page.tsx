"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function request(method: "GET" | "POST" = "GET") {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.replace("/login?reason=login-required");
      return null;
    }
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
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function syncNow() {
    setSyncing(true);
    setError("");
    try {
      const json = await request("POST");
      if (json) setPayload(json);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Synchroniseren mislukt.");
    } finally {
      setSyncing(false);
    }
  }

  const rows = payload?.records ?? [];

  return (
    <main className="football-cards-preview-page">
      <header className="football-cards-preview-header">
        <div>
          <p>Admin preview · Club</p>
          <h1>Kaarten & schorsingen</h1>
          <span>Bron: officiële clubsite Eendracht Aalst-Lede</span>
        </div>
        <div className="football-cards-preview-mark">🟨</div>
      </header>

      <section className="football-cards-preview-controls">
        <label>
          <span>Ploeg</span>
          <select value="eerste-elftal" disabled>
            <option value="eerste-elftal">Eerste elftal</option>
          </select>
        </label>
        <button type="button" onClick={syncNow} disabled={syncing}>
          {syncing ? "Bijwerken…" : "Nu bijwerken"}
        </button>
      </section>

      {loading ? <div className="football-cards-preview-state">Kaarten laden…</div> : null}
      {error ? <div className="football-cards-preview-state is-error">{error}</div> : null}

      {!loading && !rows.length ? (
        <div className="football-cards-preview-state">
          Nog geen kaartgegevens opgeslagen. Gebruik <strong>Nu bijwerken</strong> voor de eerste synchronisatie met de clubsite.
        </div>
      ) : null}

      {rows.length ? (
        <section className="football-cards-preview-list">
          {rows.map((row) => (
            <article key={row.id}>
              <div className="football-cards-preview-player">
                <strong>{row.player_name}</strong>
                {row.suspension_note ? <small>{row.suspension_note}</small> : null}
              </div>
              <div className="football-cards-preview-counts">
                <span title="Gele kaarten">🟨 <b>{row.yellow_cards}</b></span>
                {row.red_cards ? <span title="Rode kaarten">🟥 <b>{row.red_cards}</b></span> : null}
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <p className="football-cards-preview-note">
        De clubsite vermeldt kaartenaantallen per speler. Schorsingen worden niet afgeleid zolang de bron ze niet expliciet vermeldt.
      </p>

      <footer className="football-cards-preview-footer">
        <span>
          {payload?.state?.last_success_at
            ? `Laatste succesvolle update: ${new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payload.state.last_success_at))}`
            : "Nog niet gesynchroniseerd"}
        </span>
        <a href={payload?.sourceUrl ?? "https://www.eendracht-aalst-lede.be/sportief/eerste-elftal/spelers-staff/"} target="_blank" rel="noreferrer">
          Open bron ↗
        </a>
      </footer>
    </main>
  );
}
