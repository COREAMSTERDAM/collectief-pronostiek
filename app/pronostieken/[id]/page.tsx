"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useParams } from "next/navigation";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
};

type PredictionRow = {
  id: number;
  pred_home: number;
  pred_away: number;
  points: number;
  user_id: string;
};

type Profile = {
  id: string;
  name: string;
};

export default function PronostiekenPage() {
  const params = useParams();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<
    (PredictionRow & { name: string })[]
  >([]);

  useEffect(() => {
    async function loadData() {
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (matchError) {
        alert(matchError.message);
        return;
      }

      setMatch(matchData);

      const now = new Date();
      const kickoff = new Date(matchData.kickoff);

      if (now < kickoff) {
        return;
      }

      const { data: predictionsData, error: predictionsError } = await supabase
        .from("predictions")
        .select("id, user_id, pred_home, pred_away, points")
        .eq("match_id", matchId);

      if (predictionsError) {
        alert(predictionsError.message);
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name");

      const merged =
        predictionsData?.map((prediction) => {
          const profile = profilesData?.find(
            (p: Profile) => p.id === prediction.user_id
          );

          return {
            ...prediction,
            name: profile?.name || "Onbekend",
          };
        }) || [];

      setPredictions(merged);
    }

    loadData();
  }, [matchId]);

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        Laden...
      </main>
    );
  }

  const isClosed = new Date() >= new Date(match.kickoff);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Pronostieken</h1>

        <div className="rounded-xl bg-slate-800 p-4 mb-6">
          <p className="font-bold text-xl">
            {match.home_team} - {match.away_team}
          </p>

          <p className="text-slate-300 text-sm">
            {new Date(match.kickoff).toLocaleString("nl-BE")}
          </p>

          {match.home_score !== null && match.away_score !== null && (
            <p className="text-green-400 font-bold mt-2">
              Uitslag: {match.home_score} - {match.away_score}
            </p>
          )}
        </div>

        {!isClosed && (
          <p className="text-slate-300">
            Pronostieken worden zichtbaar na de aftrap.
          </p>
        )}

        {isClosed && (
          <div className="space-y-3">
            {predictions.map((prediction) => (
              <div
                key={prediction.id}
                className="rounded-xl bg-slate-800 p-4 flex justify-between items-center"
              >
                <div>
                  <p className="font-bold">{prediction.name}</p>
                  <p className="text-slate-300">
                    {prediction.pred_home} - {prediction.pred_away}
                  </p>
                </div>

                <p className="font-bold">
                  {prediction.points} punten
                </p>
              </div>
            ))}

            {predictions.length === 0 && (
              <p className="text-slate-300">
                Nog geen pronostieken voor deze wedstrijd.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}