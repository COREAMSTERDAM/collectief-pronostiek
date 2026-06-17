"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Profile = {
  id: string;
  name: string;
};

type Prediction = {
  user_id: string;
  points: number;
};

type Ranking = {
  user_id: string;
  name: string;
  total_points: number;
};

export default function KlassementPage() {
  const [ranking, setRanking] = useState<Ranking[]>([]);

  useEffect(() => {
    async function loadRanking() {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name");

      if (profilesError) {
        alert(profilesError.message);
        return;
      }

      const { data: predictions, error: predictionsError } = await supabase
        .from("predictions")
        .select("user_id, points");

      if (predictionsError) {
        alert(predictionsError.message);
        return;
      }

      const totals =
        profiles?.map((profile: Profile) => {
          const userPredictions =
            predictions?.filter(
              (prediction: Prediction) =>
                prediction.user_id === profile.id
            ) || [];

          const totalPoints = userPredictions.reduce(
            (sum, prediction) => sum + (prediction.points || 0),
            0
          );

          return {
            user_id: profile.id,
            name: profile.name,
            total_points: totalPoints,
          };
        }) || [];

      totals.sort((a, b) => b.total_points - a.total_points);

      setRanking(totals);
    }

    loadRanking();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Klassement</h1>

        <div className="space-y-3">
          {ranking.map((player, index) => (
            <div
              key={player.user_id}
              className="rounded-xl bg-slate-800 p-4 flex justify-between items-center"
            >
              <div>
                <p className="font-bold">
                  {index === 0 && "🥇 "}
                  {index === 1 && "🥈 "}
                  {index === 2 && "🥉 "}
                  {index + 1}. {player.name}
                </p>
              </div>

              <p className="font-bold">
                {player.total_points} punten
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}