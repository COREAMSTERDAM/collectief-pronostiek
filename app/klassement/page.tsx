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
  match_id: number;
};

type Match = {
  id: number;
  status: string;
  kickoff: string;
};

type Ranking = {
  user_id: string;
  name: string;
  total_points: number;
  movement: number;
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
        .select("user_id, points, match_id");

      if (predictionsError) {
        alert(predictionsError.message);
        return;
      }

      const { data: matches, error: matchesError } = await supabase
        .from("matches")
        .select("id, status, kickoff")
        .eq("status", "afgewerkt")
        .order("kickoff", { ascending: false });

      if (matchesError) {
        alert(matchesError.message);
        return;
      }

      const latestFinishedMatchId = matches?.[0]?.id;

      function buildRanking(excludeMatchId?: number) {
        const totals =
          profiles?.map((profile: Profile) => {
            const userPredictions =
              predictions?.filter((prediction: Prediction) => {
                const sameUser = prediction.user_id === profile.id;
                const notExcluded =
                  !excludeMatchId || prediction.match_id !== excludeMatchId;

                return sameUser && notExcluded;
              }) || [];

            const totalPoints = userPredictions.reduce(
              (sum, prediction) => sum + (prediction.points || 0),
              0
            );

            return {
              user_id: profile.id,
              name: profile.name,
              total_points: totalPoints,
              movement: 0,
            };
          }) || [];

        totals.sort((a, b) => b.total_points - a.total_points);
        return totals;
      }

      const currentRanking = buildRanking();
      const previousRanking = latestFinishedMatchId
        ? buildRanking(latestFinishedMatchId)
        : currentRanking;

      const rankingWithMovement = currentRanking.map((player, currentIndex) => {
        const previousIndex = previousRanking.findIndex(
          (oldPlayer) => oldPlayer.user_id === player.user_id
        );

        const movement =
          previousIndex >= 0 ? previousIndex - currentIndex : 0;

        return {
          ...player,
          movement,
        };
      });

      setRanking(rankingWithMovement);
    }

    loadRanking();
  }, []);

  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];

  function movementLabel(movement: number) {
    if (movement > 0) return `↑${movement}`;
    if (movement < 0) return `↓${Math.abs(movement)}`;
    return "—";
  }

  function movementClass(movement: number) {
    if (movement > 0) return "text-green-400";
    if (movement < 0) return "text-red-400";
    return "text-slate-400";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Klassement</h1>

        {ranking.length > 0 && (
          <div className="mb-8">
            <div className="flex items-end justify-center gap-3">
              {second && (
                <div className="w-1/3 rounded-xl bg-slate-700 p-3 text-center">
                  <div className="text-3xl mb-2">🥈</div>
                  <p className="font-bold text-sm">{second.name}</p>
                  <p className="text-slate-300 text-sm">
                    {second.total_points} punten
                  </p>
                  <p className={`font-bold ${movementClass(second.movement)}`}>
                    {movementLabel(second.movement)}
                  </p>
                  <div className="mt-3 h-16 rounded-lg bg-slate-600 flex items-center justify-center font-bold">
                    2
                  </div>
                </div>
              )}

              {first && (
                <div className="w-1/3 rounded-xl bg-yellow-800 p-3 text-center">
                  <div className="text-4xl mb-2">🥇</div>
                  <p className="font-bold text-sm">{first.name}</p>
                  <p className="text-yellow-100 text-sm">
                    {first.total_points} punten
                  </p>
                  <p className={`font-bold ${movementClass(first.movement)}`}>
                    {movementLabel(first.movement)}
                  </p>
                  <div className="mt-3 h-24 rounded-lg bg-yellow-700 flex items-center justify-center font-bold text-xl">
                    1
                  </div>
                </div>
              )}

              {third && (
                <div className="w-1/3 rounded-xl bg-orange-900 p-3 text-center">
                  <div className="text-3xl mb-2">🥉</div>
                  <p className="font-bold text-sm">{third.name}</p>
                  <p className="text-orange-100 text-sm">
                    {third.total_points} punten
                  </p>
                  <p className={`font-bold ${movementClass(third.movement)}`}>
                    {movementLabel(third.movement)}
                  </p>
                  <div className="mt-3 h-12 rounded-lg bg-orange-800 flex items-center justify-center font-bold">
                    3
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-4">Volledig klassement</h2>

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
                <p className={`text-sm font-bold ${movementClass(player.movement)}`}>
                  {movementLabel(player.movement)}
                </p>
              </div>

              <p className="font-bold">{player.total_points} punten</p>
            </div>
          ))}

          {ranking.length === 0 && (
            <p className="text-slate-300">Nog geen spelers beschikbaar.</p>
          )}
        </div>
      </div>
    </main>
  );
}