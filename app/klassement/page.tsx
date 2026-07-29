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

type Ranking = {
  user_id: string;
  name: string;
  total_points: number;
  movement: number;
};

export default function KlassementPage() {
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRanking() {
      setLoading(true);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        alert(userError.message);
        setLoading(false);
        return;
      }

      setCurrentUserId(userData.user?.id ?? null);

      const { data: profiles, error: profilesError } =
        await supabase
          .from("profiles")
          .select("id, name");

      if (profilesError) {
        alert(profilesError.message);
        setLoading(false);
        return;
      }

      const { data: predictions, error: predictionsError } =
        await supabase
          .from("predictions")
          .select("user_id, points, match_id");

      if (predictionsError) {
        alert(predictionsError.message);
        setLoading(false);
        return;
      }

      const { data: matches, error: matchesError } =
        await supabase
          .from("matches")
          .select("id, status, kickoff")
          .eq("status", "afgewerkt")
          .order("kickoff", { ascending: false });

      if (matchesError) {
        alert(matchesError.message);
        setLoading(false);
        return;
      }

      const latestFinishedMatchId = matches?.[0]?.id;

      function buildRanking(excludeMatchId?: number) {
        const totals =
          profiles?.map((profile: Profile) => {
            const userPredictions =
              predictions?.filter((prediction: Prediction) => {
                const sameUser =
                  prediction.user_id === profile.id;

                const notExcluded =
                  !excludeMatchId ||
                  prediction.match_id !== excludeMatchId;

                return sameUser && notExcluded;
              }) ?? [];

            const totalPoints = userPredictions.reduce(
              (sum, prediction) =>
                sum + (prediction.points || 0),
              0
            );

            return {
              user_id: profile.id,
              name: profile.name,
              total_points: totalPoints,
              movement: 0,
            };
          }) ?? [];

        totals.sort(
          (a, b) => b.total_points - a.total_points
        );

        return totals;
      }

      const currentRanking = buildRanking();

      const previousRanking = latestFinishedMatchId
        ? buildRanking(Number(latestFinishedMatchId))
        : currentRanking;

      const rankingWithMovement = currentRanking.map(
        (player, currentIndex) => {
          const previousIndex = previousRanking.findIndex(
            (oldPlayer) =>
              oldPlayer.user_id === player.user_id
          );

          const movement =
            previousIndex >= 0
              ? previousIndex - currentIndex
              : 0;

          return {
            ...player,
            movement,
          };
        }
      );

      setRanking(rankingWithMovement);
      setLoading(false);
    }

    loadRanking();
  }, []);

  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];

  function movementLabel(movement: number) {
    if (movement > 0) return `↑ ${movement}`;
    if (movement < 0) return `↓ ${Math.abs(movement)}`;
    return "—";
  }

  function movementClass(movement: number) {
    if (movement > 0) return "text-emerald-400";
    if (movement < 0) return "text-rose-400";
    return "text-slate-400";
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">
              Klassement laden...
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
            Klassement
          </h1>

          <p className="ucl-subtitle">
            Bekijk wie momenteel aan kop staat.
          </p>
        </div>

        {ranking.length > 0 && (
          <section className="mb-8">
            <div className="flex items-end justify-center gap-3">
              {second && (
                <PodiumCard
                  player={second}
                  position={2}
                  movementLabel={movementLabel}
                  movementClass={movementClass}
                  isCurrentUser={
                    second.user_id === currentUserId
                  }
                />
              )}

              {first && (
                <PodiumCard
                  player={first}
                  position={1}
                  movementLabel={movementLabel}
                  movementClass={movementClass}
                  isCurrentUser={
                    first.user_id === currentUserId
                  }
                />
              )}

              {third && (
                <PodiumCard
                  player={third}
                  position={3}
                  movementLabel={movementLabel}
                  movementClass={movementClass}
                  isCurrentUser={
                    third.user_id === currentUserId
                  }
                />
              )}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4">
            <h2 className="text-xl font-black text-white">
              Volledig klassement
            </h2>

            <p className="ucl-muted">
              Posities worden berekend op basis van het totale aantal punten.
            </p>
          </div>

          {ranking.length === 0 ? (
            <div className="ucl-card">
              <p className="ucl-muted">
                Nog geen spelers beschikbaar.
              </p>
            </div>
          ) : (
            <div className="ucl-card overflow-hidden p-0">
              {ranking.map((player, index) => {
                const isCurrentUser =
                  player.user_id === currentUserId;

                return (
                  <div
                    key={player.user_id}
                    className={`ucl-ranking-row ${
                      isCurrentUser
                        ? "ucl-ranking-current"
                        : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-black text-white">
                        {index === 0
                          ? "🥇"
                          : index === 1
                          ? "🥈"
                          : index === 2
                          ? "🥉"
                          : index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-black text-white">
                          {player.name}

                          {isCurrentUser && (
                            <span className="ml-2 text-sm font-bold text-emerald-300">
                              jij
                            </span>
                          )}
                        </p>

                        <p
                          className={`text-sm font-bold ${movementClass(
                            player.movement
                          )}`}
                        >
                          {movementLabel(player.movement)}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-lg font-black text-white">
                        {player.total_points}
                      </p>

                      <p className="text-xs font-semibold text-slate-400">
                        punten
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <a
          href="/"
          className="ucl-button-secondary mt-6"
        >
          Terug naar dashboard
        </a>
      </div>
    </main>
  );
}

function PodiumCard({
  player,
  position,
  movementLabel,
  movementClass,
  isCurrentUser,
}: {
  player: Ranking;
  position: 1 | 2 | 3;
  movementLabel: (movement: number) => string;
  movementClass: (movement: number) => string;
  isCurrentUser: boolean;
}) {
  const podiumHeight =
    position === 1
      ? "h-24"
      : position === 2
      ? "h-16"
      : "h-12";

  const podiumIcon =
    position === 1
      ? "🥇"
      : position === 2
      ? "🥈"
      : "🥉";

  const cardClass =
    position === 1
      ? "border-amber-300/35 bg-amber-400/10"
      : position === 2
      ? "border-slate-300/25 bg-slate-300/10"
      : "border-orange-400/25 bg-orange-400/10";

  const podiumClass =
    position === 1
      ? "border-amber-300/25 bg-gradient-to-b from-amber-400/30 to-amber-700/20 text-amber-100"
      : position === 2
      ? "border-slate-300/20 bg-gradient-to-b from-slate-300/20 to-slate-700/20 text-slate-100"
      : "border-orange-400/20 bg-gradient-to-b from-orange-400/20 to-orange-800/20 text-orange-100";

  return (
    <div
      className={`w-1/3 rounded-2xl border p-3 text-center backdrop-blur-xl ${cardClass} ${
        isCurrentUser
          ? "ring-1 ring-emerald-400/60"
          : ""
      }`}
    >
      <div
        className={
          position === 1
            ? "mb-2 text-4xl"
            : "mb-2 text-3xl"
        }
      >
        {podiumIcon}
      </div>

      <p className="truncate text-sm font-black text-white">
        {player.name}
      </p>

      {isCurrentUser && (
        <p className="mt-1 text-xs font-bold text-emerald-300">
          Jij
        </p>
      )}

      <p className="mt-1 text-sm font-semibold text-slate-200">
        {player.total_points} punten
      </p>

      <p
        className={`mt-1 font-black ${movementClass(
          player.movement
        )}`}
      >
        {movementLabel(player.movement)}
      </p>

      <div
        className={`mt-3 flex items-center justify-center rounded-xl border font-black ${podiumHeight} ${podiumClass}`}
      >
        {position}
      </div>
    </div>
  );
}