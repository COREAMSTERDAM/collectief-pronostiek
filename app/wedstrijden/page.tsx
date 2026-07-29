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

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        alert(userError.message);
        setLoading(false);
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
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-md pt-10">
          <p>Laden...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="mx-auto max-w-md pt-10">
        <h1 className="mb-6 text-3xl font-bold">
          Wedstrijden
        </h1>

        {matches.length === 0 ? (
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-slate-300">
              Er zijn momenteel geen wedstrijden.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const isClosed =
                new Date(match.kickoff).getTime() <= Date.now();

              return (
                <div
                  key={match.id}
                  className="rounded-xl bg-slate-800 p-4"
                >
                  <p className="font-bold">
                    {match.home_team} - {match.away_team}
                  </p>

                  <p className="text-sm text-slate-300">
                    {new Date(match.kickoff).toLocaleString(
                      "nl-BE"
                    )}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    Status:{" "}
                    {isClosed ? "gesloten" : match.status}
                  </p>

                  {match.myPrediction && (
                    <p className="mt-2 text-sm text-green-400">
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
                      className="mt-4 block w-full rounded-lg bg-white p-3 text-center font-bold text-black"
                    >
                      {match.myPrediction
                        ? "Pronostiek aanpassen"
                        : "Pronostiek invullen"}
                    </a>
                  ) : (
                    <a
                      href={`/pronostieken/${match.id}`}
                      className="mt-4 block w-full rounded-lg bg-white p-3 text-center font-bold text-black"
                    >
                      Bekijk pronostieken
                    </a>
                  )}
                </div>
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
      <div className="mt-4 rounded-xl bg-slate-900 p-4">
        <p className="font-bold">
          🔥 Meest gekozen uitslag
        </p>

        <p className="mt-2 text-sm text-slate-400">
          Er zijn nog geen pronostieken ingediend.
        </p>
      </div>
    );
  }

  const highestAmount = Math.max(
    ...stats.map((item) => item.aantal)
  );

  return (
    <div className="mt-4 rounded-xl bg-slate-900 p-4">
      <p className="font-bold">
        🔥 Meest gekozen uitslag
      </p>

      {/* <p className="mt-1 text-sm text-slate-400">
        {total}{" "}
        {total === 1
          ? "pronostiek ontvangen"
          : "pronostieken ontvangen"}
      </p> */}

      <div className="mt-4 space-y-3">
        {stats.slice(0, 4).map((item) => {
          const percentage = Math.round(
            (item.aantal / total) * 100
          );

          const isMostChosen =
            item.aantal === highestAmount;

          return (
            <div
              key={`${item.pred_home}-${item.pred_away}`}
              className="space-y-1"
            >
              <div className="flex items-center justify-between text-sm">
                <span
                  className={
                    isMostChosen ? "font-bold" : ""
                  }
                >
                  {item.pred_home} - {item.pred_away}
                  {isMostChosen && " 👑"}
                </span>

                <span className="text-slate-300">
                  {percentage}% ({item.aantal})
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width: `${percentage}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}