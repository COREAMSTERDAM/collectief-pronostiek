"use client";

import { useEffect, useState } from "react";
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

      if (exactScore) {
        points = 3;
      } else if (realResult === predictedResult) {
        points = 1;
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
      <div className="ucl-container">
        <div className="mb-7">
          <h1 className="ucl-title">Admin</h1>

          <p className="ucl-subtitle">
            Voeg wedstrijden toe en verwerk de officiële uitslagen.
          </p>
        </div>

        <section className="ucl-card mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-black text-white">
              Wedstrijd toevoegen
            </h2>

            <p className="ucl-muted">
              Vul de ploegen en het aanvangsuur in.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="home-team"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Thuisploeg
              </label>

              <input
                id="home-team"
                type="text"
                placeholder="Bijvoorbeeld Eendracht Aalst Lede"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="ucl-input"
              />
            </div>

            <div>
              <label
                htmlFor="away-team"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Uitploeg
              </label>

              <input
                id="away-team"
                type="text"
                placeholder="Bijvoorbeeld SK Berlare"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="ucl-input"
              />
            </div>

            <div>
              <label
                htmlFor="kickoff"
                className="mb-2 block text-sm font-bold text-slate-200"
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
              className="ucl-button-primary"
            >
              Wedstrijd toevoegen
            </button>
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-black text-white">
              Bestaande wedstrijden
            </h2>

            <p className="ucl-muted">
              Vul na de wedstrijd de officiële uitslag in.
            </p>
          </div>

          {matches.length === 0 ? (
            <div className="ucl-card">
              <p className="ucl-muted">
                Er zijn nog geen wedstrijden toegevoegd.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
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
    <article className="ucl-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="ucl-match-title">
            {match.home_team} - {match.away_team}
          </p>

          <p className="ucl-muted">
            {new Date(match.kickoff).toLocaleString("nl-BE")}
          </p>
        </div>

        <span className="ucl-status">
          <span>{isFinished ? "✓" : "●"}</span>
          <span>{isFinished ? "Afgewerkt" : match.status}</span>
        </span>
      </div>

      {isFinished &&
        match.home_score !== null &&
        match.away_score !== null && (
          <div className="ucl-card-dark text-center">
            <p className="ucl-muted">Huidige uitslag</p>

            <p className="mt-1 text-3xl font-black text-white">
              {match.home_score} - {match.away_score}
            </p>
          </div>
        )}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`home-score-${match.id}`}
            className="mb-2 block text-center text-sm font-bold text-slate-200"
          >
            {match.home_team}
          </label>

          <input
            id={`home-score-${match.id}`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="ucl-input text-center text-xl font-black"
          />
        </div>

        <div>
          <label
            htmlFor={`away-score-${match.id}`}
            className="mb-2 block text-center text-sm font-bold text-slate-200"
          >
            {match.away_team}
          </label>

          <input
            id={`away-score-${match.id}`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            placeholder="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="ucl-input text-center text-xl font-black"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="ucl-button-primary"
      >
        {isFinished
          ? "Uitslag opnieuw opslaan"
          : "Uitslag opslaan + punten berekenen"}
      </button>
    </article>
  );
}