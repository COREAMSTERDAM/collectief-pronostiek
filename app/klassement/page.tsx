"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type Prediction = {
  user_id: string;
  points: number | null;
  match_id: number;
};

type Ranking = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  total_points: number;
  movement: number;
  recent_form: number[];
};

export default function KlassementPage() {
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScoringGuide, setShowScoringGuide] = useState(false);

  useEffect(() => {
    async function loadRanking() {
      setLoading(true);

const { data: userData } =
  await supabase.auth.getUser();

if (!userData.user) {
  window.location.href = "/login?reason=login-required";
  return;
}

      setCurrentUserId(userData.user?.id ?? null);

      const { data: profiles, error: profilesError } =
        await supabase
          .from("profiles")
          .select("id, name, avatar_url");

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
      const latestFinishedMatchIds =
        matches?.slice(0, 5).map((match) => Number(match.id)) ?? [];

      function buildRecentForm(userId: string) {
        return latestFinishedMatchIds
          .slice()
          .reverse()
          .map((matchId) =>
            predictions?.find(
              (prediction: Prediction) =>
                prediction.user_id === userId &&
                Number(prediction.match_id) === matchId &&
                prediction.points !== null,
            ),
          )
          .filter(
            (prediction): prediction is Prediction =>
              Boolean(prediction),
          )
          .map((prediction) => prediction.points ?? 0);
      }

      function buildRanking(excludeMatchId?: number) {
        const totals =
          profiles?.map((profile: Profile) => {
            const userPredictions =
              predictions?.filter((prediction: Prediction) => {
                const sameUser =
                  prediction.user_id === profile.id;

                const notExcluded =
                  !excludeMatchId ||
                  Number(prediction.match_id) !==
                    Number(excludeMatchId);

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
              avatar_url: profile.avatar_url,
              total_points: totalPoints,
              movement: 0,
              recent_form: buildRecentForm(profile.id),
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

  const biggestRiser =
    ranking
      .filter((player) => player.movement > 0)
      .sort((a, b) => {
        if (b.movement !== a.movement) {
          return b.movement - a.movement;
        }

        return b.total_points - a.total_points;
      })[0] ?? null;

  const biggestRiserPosition = biggestRiser
    ? ranking.findIndex(
        (player) => player.user_id === biggestRiser.user_id,
      ) + 1
    : null;

  const biggestRiserPreviousPosition =
    biggestRiser && biggestRiserPosition
      ? biggestRiserPosition + biggestRiser.movement
      : null;

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

          <div className="mt-5">
            <a
              href="/"
              className="ucl-button-secondary"
            >
              ← Terug naar dashboard
            </a>
          </div>
        </div>

        <section className="ucl-card mb-8">
          <button
            type="button"
            onClick={() => setShowScoringGuide((current) => !current)}
            aria-expanded={showScoringGuide}
            aria-controls="puntensysteem-uitleg"
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-2xl">
                🏆
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">
                  Puntensysteem
                </h2>

                <p className="ucl-muted">
                  Bekijk wanneer je 5, 3, 2 of 0 punten krijgt.
                </p>
              </div>
            </div>

            <span
              className={`shrink-0 text-2xl font-black text-sky-300 transition-transform duration-200 ${
                showScoringGuide ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
             ⌄
            </span>
          </button>

          {showScoringGuide && (
            <div
              id="puntensysteem-uitleg"
              className="mt-6 border-t border-white/10 pt-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <p className="text-lg font-black text-white">
                    ✅ Exacte uitslag
                  </p>
                  <p className="mt-2 text-4xl font-black text-emerald-300">
                    5
                  </p>
                  <p className="text-sm text-slate-300">punten</p>
                </div>

                <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                  <p className="text-lg font-black text-white">
                    ⚽ Juist doelpuntensaldo
                  </p>
                  <p className="mt-2 text-4xl font-black text-sky-300">
                    3
                  </p>
                  <p className="text-sm text-slate-300">punten</p>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <p className="text-lg font-black text-white">
                    👍 Juiste winnaar of gelijkspel
                  </p>
                  <p className="mt-2 text-4xl font-black text-amber-300">
                    2
                  </p>
                  <p className="text-sm text-slate-300">punten</p>
                </div>

                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                  <p className="text-lg font-black text-white">
                    ❌ Verkeerde voorspelling
                  </p>
                  <p className="mt-2 text-4xl font-black text-rose-300">
                    0
                  </p>
                  <p className="text-sm text-slate-300">punten</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="mb-3 text-lg font-black text-white">
                  Voorbeelden
                </h3>

                <div className="space-y-2 text-sm text-slate-300">
                  <p>
                    <strong>Voorspeld 2-1, uitslag 2-1:</strong>{" "}
                    <span className="font-bold text-emerald-300">
                      5 punten
                    </span>
                  </p>

                  <p>
                    <strong>Voorspeld 2-1, uitslag 3-2:</strong>{" "}
                    <span className="font-bold text-sky-300">
                      3 punten
                    </span>
                  </p>

                  <p>
                    <strong>Voorspeld 2-1, uitslag 4-2:</strong>{" "}
                    <span className="font-bold text-amber-300">
                      2 punten
                    </span>
                  </p>

                  <p>
                    <strong>Voorspeld 2-1, uitslag 1-2:</strong>{" "}
                    <span className="font-bold text-rose-300">
                      0 punten
                    </span>
                  </p>
                </div>

                <div className="mt-5 rounded-xl border border-sky-400/20 bg-sky-500/10 p-4">
                  <p className="text-sm font-black text-white">
                    Wat is doelpuntensaldo?
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Het doelpuntensaldo is het verschil tussen de doelpunten.
                    De uitslagen <strong>2-1</strong>, <strong>3-2</strong> en{" "}
                    <strong>1-0</strong> hebben allemaal een verschil van één
                    doelpunt.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

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

        <section className="mb-8">
          {biggestRiser ? (
            <Link
              href={`/profiel/${biggestRiser.user_id}`}
              className="group mx-auto block max-w-xl rounded-3xl border border-emerald-300/20 bg-gradient-to-br from-emerald-500/15 via-slate-950/90 to-sky-500/10 p-5 shadow-xl shadow-emerald-950/10 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-300/40"
              aria-label={`Bekijk het profiel van grootste stijger ${biggestRiser.name}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-500/15 text-3xl">
                  🚀
                </div>

                <PlayerAvatar
                  name={biggestRiser.name}
                  avatarUrl={biggestRiser.avatar_url}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                    Grootste stijger
                  </p>

                  <h2 className="mt-1 truncate text-sm font-black leading-tight text-white">
                    {biggestRiser.name}
                  </h2>

                  <p className="mt-1 text-sm font-bold text-slate-400">
                    Van #{biggestRiserPreviousPosition} naar #
                    {biggestRiserPosition}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-3xl font-black text-emerald-300">
                    +{biggestRiser.movement}
                  </p>

                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    plaatsen
                  </p>
                </div>
              </div>

              <p className="mt-4 text-center text-xs font-bold text-emerald-200/80">
                Bekijk profiel →
              </p>
            </Link>
          ) : (
            <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
                  🚀
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Grootste stijger
                  </p>

                  <h2 className="mt-1 text-xl font-black text-white">
                    Nog geen stijger
                  </h2>

                  <p className="mt-1 text-sm font-semibold text-slate-400">
                    Na de volgende positiewijziging verschijnt hier automatisch
                    de grootste stijger.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

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
                  <Link
                    key={player.user_id}
                    href={`/profiel/${player.user_id}`}
                    aria-label={`Bekijk het profiel van ${player.name}`}
                    className={`group grid grid-cols-[minmax(0,1fr)_5rem_1rem] items-center gap-2 border-b border-white/[0.075] px-3 py-3 transition last:border-b-0 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
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

                      <PlayerAvatar
                        name={player.name}
                        avatarUrl={player.avatar_url}
                        position={index + 1}
                        size="md"
                      />

                      <div className="min-w-0">
                        <p className="truncate text-[0.72rem] font-bold leading-tight text-white">
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

                        <RecentForm
                          points={player.recent_form}
                          compact
                        />
                      </div>
                    </div>

                    <div className="w-[5rem] justify-self-end text-right">
                      <p className="text-sm font-bold tabular-nums text-white">
                        {player.total_points}
                      </p>

                      <p className="text-[9px] uppercase tracking-wider text-white/35">
  Punten
</p>
                    </div>

                    <span
                      className="justify-self-end text-lg font-black text-slate-600 transition group-hover:translate-x-1 group-hover:text-sky-300"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

function RecentForm({
  points,
  compact = false,
}: {
  points: number[];
  compact?: boolean;
}) {
  if (points.length === 0) {
    return (
      <p className="mt-1 text-xs font-semibold text-slate-500">
        Nog geen vorm
      </p>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 ${compact ? "mt-1" : ""}`}
      aria-label={`Recente vorm: ${points.join(", ")} punten`}
      title="Recente vorm · oud naar nieuw"
    >
      {points.map((point, index) => {
        const style =
          point === 5
            ? "border-emerald-300/30 bg-emerald-500/20 text-emerald-200"
            : point === 3
            ? "border-sky-300/30 bg-sky-500/20 text-sky-200"
            : point === 2
            ? "border-amber-300/30 bg-amber-500/20 text-amber-200"
            : "border-rose-300/25 bg-rose-500/15 text-rose-200";

        return (
          <span
            key={`${point}-${index}`}
            className={`flex items-center justify-center rounded-md border font-black ${style} ${
              compact
                ? "h-6 min-w-6 px-1 text-[10px]"
                : "h-9 min-w-9 px-2 text-sm"
            }`}
          >
            {point}
          </span>
        );
      })}
    </div>
  );
}

function PlayerAvatar({
  name,
  avatarUrl,
  position,
  size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  position?: number;
  size?: "md" | "lg";
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const sizeClass =
    size === "lg"
      ? "h-10 w-10 text-sm"
      : "h-6 w-6 text-[10px]";

  const ringClass =
    position === 1
      ? "border-amber-300 ring-2 ring-amber-300/35"
      : position === 2
      ? "border-slate-200 ring-2 ring-slate-200/25"
      : position === 3
      ? "border-orange-400 ring-2 ring-orange-400/30"
      : "border-white/15";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br from-sky-500/25 to-indigo-500/20 font-black text-white shadow-lg shadow-slate-950/20 ${sizeClass} ${ringClass}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Profielfoto van ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-label={`Initialen van ${name}`}>{initials}</span>
      )}
    </div>
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
    <Link
      href={`/profiel/${player.user_id}`}
      aria-label={`Bekijk het profiel van ${player.name}`}
      className={`w-1/3 rounded-2xl border p-3 text-center backdrop-blur-xl transition hover:-translate-y-1 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${cardClass} ${
        isCurrentUser
          ? "ring-1 ring-emerald-400/60"
          : ""
      }`}
    >
      <div className="mb-2 flex justify-center">
        <PlayerAvatar
          name={player.name}
          avatarUrl={player.avatar_url}
          position={position}
          size={position === 1 ? "lg" : "md"}
        />
      </div>

      <div
        className={
          position === 1
            ? "mb-2 text-4xl"
            : "mb-2 text-3xl"
        }
      >
        {podiumIcon}
      </div>

      <p className="truncate text-[0.68rem] font-bold leading-tight text-white">
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

      <div className="mt-3 flex justify-center">
        <RecentForm points={player.recent_form} compact />
      </div>

      <div
        className={`mt-3 flex items-center justify-center rounded-xl border font-black ${podiumHeight} ${podiumClass}`}
      >
        {position}
      </div>

      <p className="mt-2 text-xs font-bold text-sky-300">
        Bekijk profiel →
      </p>
    </Link>
  );
}