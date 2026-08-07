"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Prediction = {
  pred_home: number;
  pred_away: number;
  match_id: number;
};

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  myPrediction?: Prediction;
};

export default function PronostiekHistoriekPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);

      const { data: userData } =
        await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href =
          "/login?reason=login-required";
        return;
      }

      const { data: matchesData, error: matchesError } =
        await supabase
          .from("matches")
          .select(
            "id, home_team, away_team, kickoff, status, home_score, away_score"
          )
          .order("kickoff", { ascending: false });

      if (matchesError) {
        alert(matchesError.message);
        setLoading(false);
        return;
      }

      const { data: predictionsData, error: predictionsError } =
        await supabase
          .from("predictions")
          .select("match_id, pred_home, pred_away")
          .eq("user_id", userData.user.id);

      if (predictionsError) {
        alert(predictionsError.message);
        setLoading(false);
        return;
      }

      const historyMatches: Match[] = (matchesData ?? [])
        .map((match) => ({
          id: Number(match.id),
          home_team: match.home_team,
          away_team: match.away_team,
          kickoff: match.kickoff,
          status: match.status,
          home_score: match.home_score,
          away_score: match.away_score,
          myPrediction: (predictionsData ?? []).find(
            (prediction) =>
              Number(prediction.match_id) === Number(match.id)
          ),
        }))
        .filter((match) => {
          const kickoffPassed =
            new Date(match.kickoff).getTime() <= Date.now();

          const isFinished =
            match.status === "afgewerkt";

          return kickoffPassed || isFinished;
        });

      setMatches(historyMatches);
      setLoading(false);
    }

    void loadHistory();
  }, []);

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">
              Pronostiekhistoriek laden...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-7">
          <h1 className="ucl-title">
            Pronostiekhistoriek
          </h1>

          <p className="ucl-subtitle">
            Bekijk je pronostieken van gesloten en afgewerkte wedstrijden.
          </p>

          <div className="mt-5">
            <a
              href="/wedstrijden"
              className="ucl-button-secondary"
            >
              ← Terug naar open wedstrijden
            </a>
          </div>
        </div>

        {matches.length === 0 ? (
          <div className="ucl-card">
            <p className="ucl-muted">
              Er zijn nog geen afgesloten wedstrijden.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {matches.map((match) => (
              <article
                key={match.id}
                className="ucl-card"
              >
                <p className="ucl-match-title">
                  {match.home_team} - {match.away_team}
                </p>

                <p className="ucl-muted">
                  {new Date(match.kickoff).toLocaleString("nl-BE")}
                </p>

                <div className="ucl-status">
                  <span>🔒</span>
                  <span>
                    {match.status === "afgewerkt"
                      ? "Afgewerkt"
                      : "Gesloten"}
                  </span>
                </div>

                {match.home_score !== null &&
                match.away_score !== null ? (
                  <p className="mt-3 text-sm font-black text-white">
                    Uitslag: {match.home_score} - {match.away_score}
                  </p>
                ) : null}

                {match.myPrediction ? (
                  <p className="ucl-prediction">
                    Jouw pronostiek:{" "}
                    {match.myPrediction.pred_home} -{" "}
                    {match.myPrediction.pred_away}
                  </p>
                ) : (
                  <p className="ucl-muted">
                    Je hebt voor deze wedstrijd geen pronostiek ingediend.
                  </p>
                )}

                <a
                  href={`/pronostieken/${match.id}`}
                  className="ucl-button-primary"
                >
                  Bekijk pronostieken
                </a>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
