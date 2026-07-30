"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Prediction = {
  pred_home: number;
  pred_away: number;
  match_id: number;
};

type PredictionStat = {
  pred_home: number;
  pred_away: number;
  aantal: number;
};

type PredictionStatRow = {
  pred_home: number | string;
  pred_away: number | string;
  aantal: number | string;
};

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string;
  myPrediction?: Prediction;
};

export default function WedstrijdenPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictionStats, setPredictionStats] = useState<
    Record<number, PredictionStat[]>
  >({});
  const [loading, setLoading] = useState(true);

  async function loadPredictionStats(loadedMatches: Match[]) {
    const statsByMatch: Record<number, PredictionStat[]> = {};

    await Promise.all(
      loadedMatches.map(async (match) => {
        const isClosed =
          new Date(match.kickoff).getTime() <= Date.now();

        if (isClosed) {
          return;
        }

        const { data, error } = await supabase.rpc(
          "get_prediction_distribution",
          {
            p_match_id: match.id,
          }
        );

        if (error) {
          console.error(
            `Kon statistieken voor wedstrijd ${match.id} niet laden:`,
            error.message
          );

          statsByMatch[match.id] = [];
          return;
        }

        const rows = (data ?? []) as PredictionStatRow[];

        statsByMatch[match.id] = rows.map((item) => ({
          pred_home: Number(item.pred_home),
          pred_away: Number(item.pred_away),
          aantal: Number(item.aantal),
        }));
      })
    );

    setPredictionStats(statsByMatch);
  }

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);

      const { data: userData } =
  await supabase.auth.getUser();

if (!userData.user) {
  window.location.href = "/login?reason=login-required";
  return;
}

      if (!userData.user) {
        alert("Je moet eerst inloggen.");
        window.location.href = "/login";
        return;
      }

      const { data: matchesData, error: matchesError } =
        await supabase
          .from("matches")
          .select("*")
          .order("kickoff", { ascending: true });

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

      const loadedMatches: Match[] = (matchesData ?? []).map(
        (match) => ({
          id: Number(match.id),
          home_team: match.home_team,
          away_team: match.away_team,
          kickoff: match.kickoff,
          status: match.status,
          myPrediction: (predictionsData ?? []).find(
            (prediction) =>
              Number(prediction.match_id) === Number(match.id)
          ),
        })
      );

      setMatches(loadedMatches);
      await loadPredictionStats(loadedMatches);
      setLoading(false);
    }

    loadMatches();
  }, []);

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">Wedstrijden laden...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-7">
          <h1 className="ucl-title">Wedstrijden</h1>

          <p className="ucl-subtitle">
            Voorspel de uitslagen en strijd mee voor de eerste plaats.
          </p>
        </div>

        {matches.length === 0 ? (
          <div className="ucl-card">
            <p className="ucl-muted">
              Er zijn momenteel geen wedstrijden.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {matches.map((match) => {
              const isClosed =
                new Date(match.kickoff).getTime() <= Date.now();

              return (
                <article
                  key={match.id}
                  className="ucl-card"
                >
                  <p className="ucl-match-title">
                    {match.home_team} - {match.away_team}
                  </p>

                  <p className="ucl-muted">
                    {new Date(match.kickoff).toLocaleString(
                      "nl-BE"
                    )}
                  </p>

                  <div className="ucl-status">
                    <span>{isClosed ? "🔒" : "●"}</span>

                    <span>
                      {isClosed
                        ? "Gesloten"
                        : "Open voor pronostieken"}
                    </span>
                  </div>

                  {match.myPrediction && (
                    <p className="ucl-prediction">
                      Jouw pronostiek:{" "}
                      {match.myPrediction.pred_home} -{" "}
                      {match.myPrediction.pred_away}
                    </p>
                  )}

                  {!isClosed && (
                    <MostChosenScore
                      stats={
                        predictionStats[match.id] ?? []
                      }
                    />
                  )}

                  {!isClosed ? (
                    <a
                      href={`/pronostiek/${match.id}`}
                      className="ucl-button-primary"
                    >
                      {match.myPrediction
                        ? "Pronostiek aanpassen"
                        : "Pronostiek invullen"}
                    </a>
                  ) : (
                    <a
                      href={`/pronostieken/${match.id}`}
                      className="ucl-button-primary"
                    >
                      Bekijk pronostieken
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function MostChosenScore({
  stats,
}: {
  stats: PredictionStat[];
}) {
  const total = stats.reduce(
    (sum, item) => sum + item.aantal,
    0
  );

  if (total === 0) {
    return (
      <div className="ucl-card-dark">
        <div className="ucl-stat-header">
          <span>🔥 Meest gekozen uitslag</span>
        </div>

        <p className="ucl-muted">
          Er zijn nog geen pronostieken ingediend.
        </p>
      </div>
    );
  }

  const highestAmount = Math.max(
    ...stats.map((item) => item.aantal)
  );

  return (
    <div className="ucl-card-dark">
      <div className="ucl-stat-header">
        <span>🔥 Meest gekozen uitslag</span>

        <span className="ucl-stat-total">
          {total} ontvangen
        </span>
      </div>

      {stats.slice(0, 4).map((item) => {
        const percentage = Math.round(
          (item.aantal / total) * 100
        );

        const isMostChosen =
          item.aantal === highestAmount;

        return (
          <div
            key={`${item.pred_home}-${item.pred_away}`}
            className="ucl-stat-row"
          >
            <div className="ucl-stat-label">
              <span
                className={
                  isMostChosen
                    ? "ucl-stat-winner"
                    : ""
                }
              >
                {item.pred_home} - {item.pred_away}
                {isMostChosen && " 👑"}
              </span>

              <span>
                {percentage}% ({item.aantal})
              </span>
            </div>

            <div className="ucl-progress">
              <div
                className="ucl-progress-bar"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}