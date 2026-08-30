"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Tab = "kalender" | "klassement" | "uitslagen";

type Match = {
  round: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  score: string | null;
};

type Standing = {
  position: number;
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

type ClubData = {
  competition: string;
  season: string;
  source: string;
  fetchedAt: string;
  matches: Match[];
  standings: Standing[];
};

const EENDRACHT = /eendracht\s+aalst\s*[- ]?\s*lede/i;

function isEendracht(team: string) {
  return EENDRACHT.test(team);
}

function friendlyTeam(team: string) {
  return team
    .replace(/^Koninklijke\s+/i, "")
    .replace(/\s+A$/i, "")
    .replace(/^VK Ninove$/i, "KVK Ninove");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${value}T12:00:00`));
}

export default function ClubPreviewPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("kalender");
  const [data, setData] = useState<ClubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [round, setRound] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          router.replace("/login?reason=login-required");
          return;
        }

        const response = await fetch("/api/admin/club-vva", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Competitiedata laden mislukt.");
        if (!active) return;

        setData(json as ClubData);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = (json.matches as Match[]).find(
          (match) => !match.score && new Date(`${match.date}T23:59:59`) >= today,
        );
        setRound(upcoming?.round ?? (json.matches as Match[]).at(-1)?.round ?? 1);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Laden mislukt.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [router]);

  const roundMatches = useMemo(
    () => data?.matches.filter((match) => match.round === round) ?? [],
    [data, round],
  );

  const results = useMemo(
    () => [...(data?.matches ?? [])].filter((match) => match.score).reverse(),
    [data],
  );

  return (
    <main className="club-preview-page">
      <header className="club-preview-header">
        <Link href="/" className="club-preview-back" aria-label="Terug">‹</Link>
        <div>
          <p>Admin preview · Club</p>
          <h1>2e Afdeling VV A</h1>
          <span>Seizoen 2026–2027</span>
        </div>
        <div className="club-preview-mark">EA</div>
      </header>

      <nav className="club-preview-tabs" aria-label="Club onderdelen">
        {(["kalender", "klassement", "uitslagen"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? "is-active" : ""}
            onClick={() => setTab(item)}
          >
            {item === "kalender" ? "Kalender" : item === "klassement" ? "Klassement" : "Uitslagen"}
          </button>
        ))}
      </nav>

      {loading ? <div className="club-preview-state">Competitiedata laden…</div> : null}
      {error ? <div className="club-preview-state club-preview-error">{error}</div> : null}

      {!loading && data && tab === "kalender" ? (
        <section className="club-preview-panel">
          <div className="club-preview-panel-head">
            <div>
              <p>Volledig programma</p>
              <h2>Speeldag {round}</h2>
            </div>
            <select value={round ?? 1} onChange={(event) => setRound(Number(event.target.value))}>
              {Array.from({ length: 30 }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>Speeldag {value}</option>
              ))}
            </select>
          </div>
          <div className="club-preview-match-list">
            {roundMatches.map((match) => {
              const highlighted = isEendracht(match.homeTeam) || isEendracht(match.awayTeam);
              return (
                <article key={`${match.date}-${match.homeTeam}-${match.awayTeam}`} className={highlighted ? "is-eendracht" : ""}>
                  <div className="club-preview-match-meta">
                    <span>{formatDate(match.date)}</span>{match.time ? <span>{match.time.replace("u", ":")}</span> : null}
                  </div>
                  <div className="club-preview-teams">
                    <strong className={isEendracht(match.homeTeam) ? "team-eendracht" : ""}>{friendlyTeam(match.homeTeam)}</strong>
                    <span className="club-preview-score">{match.score ?? "–"}</span>
                    <strong className={isEendracht(match.awayTeam) ? "team-eendracht" : ""}>{friendlyTeam(match.awayTeam)}</strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {!loading && data && tab === "klassement" ? (
        <section className="club-preview-panel club-preview-standing-panel">
          <div className="club-preview-panel-head">
            <div><p>Algemeen klassement</p><h2>2e Afdeling VV A</h2></div>
            <span className="club-preview-live-dot">AUTO</span>
          </div>
          {data.standings.length ? (
            <div className="club-preview-table-wrap">
              <table className="club-preview-table">
                <thead><tr><th>#</th><th>Ploeg</th><th>W</th><th>G</th><th>V</th><th>DV</th><th>PT</th></tr></thead>
                <tbody>
                  {data.standings.map((row) => (
                    <tr key={row.team} className={isEendracht(row.team) ? "is-eendracht" : ""}>
                      <td>{row.position}</td>
                      <td><strong>{friendlyTeam(row.team)}</strong><small>{row.played} gespeeld</small></td>
                      <td>{row.wins}</td><td>{row.draws}</td><td>{row.losses}</td>
                      <td>{row.goalsFor - row.goalsAgainst > 0 ? "+" : ""}{row.goalsFor - row.goalsAgainst}</td>
                      <td><strong>{row.points}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="club-preview-empty">Klassement nog niet beschikbaar in de bron.</div>}
        </section>
      ) : null}

      {!loading && data && tab === "uitslagen" ? (
        <section className="club-preview-panel">
          <div className="club-preview-panel-head">
            <div><p>Alle gespeelde wedstrijden</p><h2>Uitslagen</h2></div>
            <span className="club-preview-live-dot">AUTO</span>
          </div>
          {results.length ? (
            <div className="club-preview-match-list">
              {results.map((match) => {
                const highlighted = isEendracht(match.homeTeam) || isEendracht(match.awayTeam);
                return (
                  <article key={`${match.date}-${match.homeTeam}-${match.awayTeam}`} className={highlighted ? "is-eendracht" : ""}>
                    <div className="club-preview-match-meta"><span>Speeldag {match.round} · {formatDate(match.date)}</span></div>
                    <div className="club-preview-teams">
                      <strong className={isEendracht(match.homeTeam) ? "team-eendracht" : ""}>{friendlyTeam(match.homeTeam)}</strong>
                      <span className="club-preview-score is-final">{match.score}</span>
                      <strong className={isEendracht(match.awayTeam) ? "team-eendracht" : ""}>{friendlyTeam(match.awayTeam)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <div className="club-preview-empty">Nog geen officiële uitslagen beschikbaar bij Voetbal Vlaanderen / RBFA.</div>}
        </section>
      ) : null}

      {data ? (
        <footer className="club-preview-source">
          Automatisch bijgewerkt · officiële bron: Voetbal Vlaanderen / RBFA · maximaal 15 min cache
        </footer>
      ) : null}
    </main>
  );
}
