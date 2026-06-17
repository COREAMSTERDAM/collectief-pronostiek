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

type MyPrediction = {
  id: number;
  pred_home: number;
  pred_away: number;
  points: number;
  match_id: number;
  match?: Match;
};

export default function MijnPronostiekenPage() {
  const [predictions, setPredictions] = useState<MyPrediction[]>([]);

  useEffect(() => {
    async function loadPredictions() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data: predictionsData, error: predictionsError } = await supabase
        .from("predictions")
        .select("id, pred_home, pred_away, points, match_id")
        .eq("user_id", userData.user.id)
        .order("match_id", { ascending: false });

      if (predictionsError) {
        alert(predictionsError.message);
        return;
      }

      const matchIds = predictionsData?.map((prediction) => prediction.match_id) || [];

      if (matchIds.length === 0) {
        setPredictions([]);
        return;
      }

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff, home_score, away_score, status")
        .in("id", matchIds);

      if (matchesError) {
        alert(matchesError.message);
        return;
      }

      const merged =
        predictionsData?.map((prediction) => ({
          ...prediction,
          match: matchesData?.find((match) => match.id === prediction.match_id),
        })) || [];

      setPredictions(merged);
    }

    loadPredictions();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Mijn pronostieken</h1>

        <div className="space-y-4">
          {predictions.map((prediction) => {
            const match = prediction.match;
            const isClosed = match ? new Date(match.kickoff) <= new Date() : false;

            return (
              <div key={prediction.id} className="rounded-xl bg-slate-800 p-4">
                <p className="font-bold">
                  {match?.home_team || "Onbekend"} - {match?.away_team || "Onbekend"}
                </p>

                <p className="text-slate-300 text-sm">
                  {match?.kickoff
                    ? new Date(match.kickoff).toLocaleString("nl-BE")
                    : ""}
                </p>

                <p className="text-green-400 mt-3 font-bold">
                  Mijn pronostiek: {prediction.pred_home} - {prediction.pred_away}
                </p>

                {match?.home_score !== null && match?.away_score !== null && (
                  <p className="text-slate-300 mt-1">
                    Uitslag: {match?.home_score} - {match?.away_score}
                  </p>
                )}

                <p className="font-bold mt-2">Punten: {prediction.points}</p>

                {!isClosed ? (
                  <a
                    href={`/pronostiek/${prediction.match_id}`}
                    className="block mt-4 w-full bg-white text-black font-bold p-3 rounded-lg text-center"
                  >
                    Bekijken / aanpassen
                  </a>
                ) : (
                  <a
                    href={`/pronostieken/${prediction.match_id}`}
                    className="block mt-4 w-full bg-white text-black font-bold p-3 rounded-lg text-center"
                  >
                    Bekijk alle pronostieken
                  </a>
                )}
              </div>
            );
          })}

          {predictions.length === 0 && (
            <p className="text-slate-300">
              Je hebt nog geen pronostieken ingevuld.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}