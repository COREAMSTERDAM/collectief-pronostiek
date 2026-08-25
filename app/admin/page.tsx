"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoff, setKickoff] = useState("");
  const [showAddMatch, setShowAddMatch] = useState(false);

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userData.user.id)
        .single();

      if (error || !data?.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadMatches();
      setLoading(false);
    }

    checkAdminAndLoad();
  }, []);

  async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("kickoff", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setMatches(data || []);
  }

  async function saveMatch() {
    if (!homeTeam || !awayTeam || !kickoff) {
      alert("Vul alle velden in.");
      return;
    }

    const { error } = await supabase.from("matches").insert({
      home_team: homeTeam,
      away_team: awayTeam,
      kickoff,
      status: "open",
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Wedstrijd toegevoegd!");
    setHomeTeam("");
    setAwayTeam("");
    setKickoff("");
    await loadMatches();
  }

  async function saveResult(
    matchId: number,
    homeScore: number,
    awayScore: number
  ) {
    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "afgewerkt",
      })
      .eq("id", matchId);

    if (matchError) {
      alert(matchError.message);
      return;
    }

    const { data: predictions, error: predictionsError } =
      await supabase
        .from("predictions")
        .select("*")
        .eq("match_id", matchId);

    if (predictionsError) {
      alert(predictionsError.message);
      return;
    }

    for (const prediction of predictions || []) {
      let points = 0;

      const exactScore =
        prediction.pred_home === homeScore &&
        prediction.pred_away === awayScore;

      const realResult =
        homeScore > awayScore
          ? "home"
          : homeScore < awayScore
          ? "away"
          : "draw";

      const predictedResult =
        prediction.pred_home > prediction.pred_away
          ? "home"
          : prediction.pred_home < prediction.pred_away
          ? "away"
          : "draw";

      const goalDifferenceCorrect =
        homeScore - awayScore ===
        prediction.pred_home - prediction.pred_away;

      if (exactScore) {
        points = 5;
      } else if (goalDifferenceCorrect) {
        points = 3;
      } else if (realResult === predictedResult) {
        points = 2;
      }

      const { error: updateError } = await supabase
        .from("predictions")
        .update({ points })
        .eq("id", prediction.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }
    }

    alert("Uitslag opgeslagen en punten berekend!");
    await loadMatches();
  }

  const matchSummary = useMemo(() => {
    const now = Date.now();
    const finished = matches.filter(
      (match) => match.status === "afgewerkt",
    ).length;
    const upcoming = matches.filter(
      (match) =>
        match.status !== "afgewerkt" &&
        new Date(match.kickoff).getTime() >= now,
    ).length;
    const open = matches.length - finished;

    return {
      total: matches.length,
      finished,
      upcoming,
      open,
    };
  }, [matches]);

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">Adminpagina laden...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <h1 className="ucl-title">Geen toegang</h1>

            <p className="ucl-subtitle">
              Je hebt geen adminrechten voor deze pagina.
            </p>

            <a href="/" className="ucl-button-secondary mt-6">
              Terug naar dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-5xl">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300/70">
              Beheer
            </p>
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">
              Wedstrijden
            </h1>
            <p className="mt-1 text-sm font-semibold text-white/40">
              Voeg wedstrijden toe en verwerk officiële uitslagen.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMatch((current) => !current)}
            className="ucl-button-primary !mt-0 sm:w-auto"
          >
            {showAddMatch ? "Sluiten" : "+ Wedstrijd"}
          </button>
        </header>

        <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard label="Totaal" value={matchSummary.total} />
          <SummaryCard label="Open" value={matchSummary.open} />
          <SummaryCard label="Komend" value={matchSummary.upcoming} />
          <SummaryCard label="Afgewerkt" value={matchSummary.finished} />
        </section>

        {showAddMatch ? (
          <section className="ucl-card mb-6 !p-4 sm:!p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">
                  Wedstrijd toevoegen
                </h2>
                <p className="mt-1 text-xs font-semibold text-white/35">
                  Vul ploegen en aftrap in.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.9fr_auto] md:items-end">
              <div>
                <label
                  htmlFor="home-team"
                  className="mb-1.5 block text-xs font-black uppercase tracking-wide text-white/45"
                >
                  Thuis
                </label>
                <input
                  id="home-team"
                  type="text"
                  placeholder="Thuisploeg"
                  value={homeTeam}
                  onChange={(e) => setHomeTeam(e.target.value)}
                  className="ucl-input"
                />
              </div>

              <div>
                <label
                  htmlFor="away-team"
                  className="mb-1.5 block text-xs font-black uppercase tracking-wide text-white/45"
                >
                  Uit
                </label>
                <input
                  id="away-team"
                  type="text"
                  placeholder="Uitploeg"
                  value={awayTeam}
                  onChange={(e) => setAwayTeam(e.target.value)}
                  className="ucl-input"
                />
              </div>

              <div>
                <label
                  htmlFor="kickoff"
                  className="mb-1.5 block text-xs font-black uppercase tracking-wide text-white/45"
                >
                  Aftrap
                </label>
                <input
                  id="kickoff"
                  type="datetime-local"
                  value={kickoff}
                  onChange={(e) => setKickoff(e.target.value)}
                  className="ucl-input"
                />
              </div>

              <button
                type="button"
                onClick={saveMatch}
                className="ucl-button-primary !mt-0 md:w-auto"
              >
                Toevoegen
              </button>
            </div>
          </section>
        ) : null}

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white">
                Wedstrijden
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-white/35">
                Vul na afloop de officiële score in.
              </p>
            </div>

            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-white/45">
              {matches.length}
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="ucl-card !p-5 text-center">
              <p className="text-sm font-semibold text-white/40">
                Er zijn nog geen wedstrijden toegevoegd.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <MatchResultCard
                  key={match.id}
                  match={match}
                  onSave={saveResult}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </article>
  );
}

function MatchResultCard({
  match,
  onSave,
}: {
  match: Match;
  onSave: (
    matchId: number,
    homeScore: number,
    awayScore: number
  ) => void;
}) {
  const [homeScore, setHomeScore] = useState(
    match.home_score?.toString() || ""
  );

  const [awayScore, setAwayScore] = useState(
    match.away_score?.toString() || ""
  );

  const isFinished = match.status === "afgewerkt";

  function handleSave() {
    if (homeScore === "" || awayScore === "") {
      alert("Vul beide scores in.");
      return;
    }

    const parsedHomeScore = Number(homeScore);
    const parsedAwayScore = Number(awayScore);

    if (
      !Number.isInteger(parsedHomeScore) ||
      !Number.isInteger(parsedAwayScore) ||
      parsedHomeScore < 0 ||
      parsedAwayScore < 0
    ) {
      alert("Vul geldige, positieve gehele scores in.");
      return;
    }

    onSave(match.id, parsedHomeScore, parsedAwayScore);
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-white sm:text-base">
              {match.home_team}
              <span className="mx-1.5 text-white/25">–</span>
              {match.away_team}
            </p>

            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
                isFinished
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.04] text-white/40"
              }`}
            >
              {isFinished ? "Afgewerkt" : match.status}
            </span>
          </div>

          <p className="mt-1 text-xs font-semibold text-white/35">
            {new Date(match.kickoff).toLocaleString("nl-BE")}
          </p>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <input
            id={`home-score-${match.id}`}
            aria-label={`Score ${match.home_team}`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="ucl-input !h-11 !w-16 !px-2 text-center text-lg font-black"
          />

          <span className="text-sm font-black text-white/25">–</span>

          <input
            id={`away-score-${match.id}`}
            aria-label={`Score ${match.away_team}`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="ucl-input !h-11 !w-16 !px-2 text-center text-lg font-black"
          />
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="min-h-11 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-black transition active:scale-[0.98]"
        >
          {isFinished ? "Bijwerken" : "Opslaan"}
        </button>
      </div>
    </article>
  );
}