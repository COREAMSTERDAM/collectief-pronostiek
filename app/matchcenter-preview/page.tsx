"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
  home_score: number | null;
  away_score: number | null;
};

type Prediction = {
  match_id: number;
  pred_home: number;
  pred_away: number;
};

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function chooseDefaultMatch(matches: Match[]) {
  const now = Date.now();
  const upcoming = matches
    .filter((match) => new Date(match.kickoff).getTime() >= now && match.status !== "afgewerkt")
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  if (upcoming[0]) return upcoming[0];

  return [...matches].sort(
    (a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime(),
  )[0] ?? null;
}

export default function MatchcenterPreviewPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const match = useMemo(
    () => matches.find((item) => item.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/login?reason=login-required");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (!profile?.is_admin) {
          router.replace("/");
          return;
        }

        const [{ data: matchRows, error: matchError }, { data: predictionRows }] = await Promise.all([
          supabase
            .from("matches")
            .select("id, home_team, away_team, kickoff, status, home_score, away_score")
            .order("kickoff", { ascending: false })
            .limit(20),
          supabase
            .from("predictions")
            .select("match_id, pred_home, pred_away")
            .eq("user_id", user.id),
        ]);

        if (matchError) throw matchError;
        if (!active) return;

        const loadedMatches = (matchRows ?? []) as Match[];
        setMatches(loadedMatches);
        const defaultMatch = chooseDefaultMatch(loadedMatches);
        setSelectedMatchId(defaultMatch?.id ?? null);

        if (defaultMatch) {
          const mine = ((predictionRows ?? []) as Prediction[]).find(
            (item) => Number(item.match_id) === Number(defaultMatch.id),
          );
          setPrediction(mine ?? null);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Matchcenter laden mislukt.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    let active = true;

    async function loadPrediction() {
      if (!selectedMatchId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("predictions")
        .select("match_id, pred_home, pred_away")
        .eq("user_id", user.id)
        .eq("match_id", selectedMatchId)
        .maybeSingle();

      if (active) setPrediction((data as Prediction | null) ?? null);
    }

    void loadPrediction();
    return () => { active = false; };
  }, [selectedMatchId]);

  if (loading) {
    return (
      <main className="matchcenter-preview-page">
        <div className="matchcenter-preview-loading">Matchcenter laden…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="matchcenter-preview-page">
        <div className="matchcenter-preview-loading">{error}</div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="matchcenter-preview-page">
        <div className="matchcenter-preview-loading">Nog geen wedstrijden beschikbaar.</div>
      </main>
    );
  }

  const kickoffPassed = new Date(match.kickoff).getTime() <= Date.now();
  const finished = match.status === "afgewerkt";
  const hasScore = match.home_score !== null && match.away_score !== null;

  return (
    <main className="matchcenter-preview-page">
      <header className="matchcenter-preview-topbar">
        <Link href="/" className="matchcenter-preview-back" aria-label="Terug naar preview-home">‹</Link>
        <div>
          <p>Admin preview</p>
          <h1>Matchcenter</h1>
        </div>
        <span className="matchcenter-preview-badge">PREVIEW</span>
      </header>

      {matches.length > 1 ? (
        <label className="matchcenter-preview-selector">
          <span>Wedstrijd</span>
          <select
            value={selectedMatchId ?? ""}
            onChange={(event) => setSelectedMatchId(Number(event.target.value))}
          >
            {matches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.home_team} – {item.away_team}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <section className="matchcenter-preview-hero">
        <div className="matchcenter-preview-status-row">
          <span>{finished ? "Afgelopen" : kickoffPassed ? "Gestart" : "Volgende wedstrijd"}</span>
          <span>{formatKickoff(match.kickoff)}</span>
        </div>

        <div className="matchcenter-preview-scoreboard">
          <strong>{match.home_team}</strong>
          <div className="matchcenter-preview-score">
            {hasScore ? `${match.home_score} – ${match.away_score}` : "–"}
          </div>
          <strong>{match.away_team}</strong>
        </div>
      </section>

      <section className="matchcenter-preview-summary-grid">
        <article>
          <span className="matchcenter-preview-summary-icon">⚽</span>
          <div>
            <p>Jouw pronostiek</p>
            <strong>{prediction ? `${prediction.pred_home} – ${prediction.pred_away}` : "Nog niet ingevuld"}</strong>
          </div>
        </article>
        <article>
          <span className="matchcenter-preview-summary-icon">⏱</span>
          <div>
            <p>Status</p>
            <strong>{finished ? "Afgelopen" : kickoffPassed ? "Gestart" : "Voor de match"}</strong>
          </div>
        </article>
      </section>

      <section className="matchcenter-preview-actions" aria-label="Wedstrijdonderdelen">
        <Link href={`/pronostiek/${match.id}`}>
          <span>⚽</span><strong>Pronostiek</strong><small>{prediction ? "Bekijk / wijzig" : "Invullen"}</small>
        </Link>
        <Link href={`/iedereen-coach/${match.id}`}>
          <span>▣</span><strong>Coach</strong><small>Jouw opstelling</small>
        </Link>
        <Link href={`/man-van-de-wedstrijd/${match.id}`}>
          <span>🏅</span><strong>MOTM</strong><small>Stem & uitslag</small>
        </Link>
        <Link href="/iedereen-coach/beoordelen">
          <span>⭐</span><strong>Ratings</strong><small>Spelers beoordelen</small>
        </Link>
        <Link href={`/pronostieken/${match.id}`}>
          <span>📊</span><strong>Supporters</strong><small>Pronostieken bekijken</small>
        </Link>
        <Link href="/community">
          <span>💬</span><strong>Reacties</strong><small>Naar community</small>
        </Link>
      </section>

      <section className="matchcenter-preview-live-note">
        <div>
          <span aria-hidden="true">●</span>
          <strong>Wedstrijdverloop</strong>
        </div>
        <p>
          Hier kunnen later live doelpunten, kaarten en wissels samenkomen. De huidige app slaat die gebeurtenissen nog niet apart op.
        </p>
      </section>
    </main>
  );
}
