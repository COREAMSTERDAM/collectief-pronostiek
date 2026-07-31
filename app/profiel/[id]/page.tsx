"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type ProfileRow = {
  id: string;
  name: string;
  created_at: string | null;
  avatar_url: string | null;
};

type PredictionRow = {
  user_id: string;
  points: number | null;
};

type RankingHistoryRow = {
  user_id: string;
  speeldag: number;
  position: number;
  total_points: number;
};

type SeasonPoint = {
  speeldag: number;
  position: number;
  totalPoints: number;
  pointsGained: number;
};

type PublicProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string | null;
  position: number | null;
  totalPoints: number;
  predictionsCount: number;
  scoredPredictionsCount: number;
  exactScores: number;
  correctGoalDifference: number;
  correctResult: number;
  zeroPoints: number;
  averagePoints: number;
  bestScore: number;
  season: SeasonPoint[];
};

type Achievement = {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export default function OpenbaarProfielPage() {
  const params = useParams<{ id: string }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPublicProfile() {
      if (!profileId) return;

      setLoading(true);
      setErrorMessage("");

      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        window.location.href = "/login?reason=login-required";
        return;
      }

      setCurrentUserId(authData.user.id);

      const [profilesResult, predictionsResult, historyResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("id, name, created_at, avatar_url"),
          supabase
            .from("predictions")
            .select("user_id, points"),
          supabase
            .from("ranking_history")
            .select("user_id, speeldag, position, total_points")
            .eq("user_id", profileId)
            .order("speeldag", { ascending: true }),
        ]);

      const firstError =
        profilesResult.error ??
        predictionsResult.error ??
        historyResult.error;

      if (firstError) {
        setErrorMessage(firstError.message);
        setLoading(false);
        return;
      }

      const profiles = (profilesResult.data ?? []) as ProfileRow[];
      const predictions = (predictionsResult.data ?? []) as PredictionRow[];
      const rankingHistory =
        (historyResult.data ?? []) as RankingHistoryRow[];

      const selectedProfile = profiles.find((item) => item.id === profileId);

      if (!selectedProfile) {
        setErrorMessage("Dit profiel kon niet worden gevonden.");
        setLoading(false);
        return;
      }

      const ranking = profiles
        .map((item) => ({
          userId: item.id,
          totalPoints: predictions
            .filter((prediction) => prediction.user_id === item.id)
            .reduce(
              (sum, prediction) => sum + (prediction.points ?? 0),
              0,
            ),
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

      const rankingIndex = ranking.findIndex(
        (item) => item.userId === profileId,
      );
      const userPredictions = predictions.filter(
        (prediction) => prediction.user_id === profileId,
      );
      const scoredPredictions = userPredictions.filter(
        (prediction) => prediction.points !== null,
      );
      const totalPoints =
        ranking.find((item) => item.userId === profileId)?.totalPoints ?? 0;

      const season = rankingHistory.map((row, index) => {
        const previousPoints =
          index > 0 ? rankingHistory[index - 1].total_points : 0;

        return {
          speeldag: row.speeldag,
          position: row.position,
          totalPoints: row.total_points,
          pointsGained: row.total_points - previousPoints,
        };
      });

      setProfile({
        id: selectedProfile.id,
        name: selectedProfile.name,
        avatarUrl: selectedProfile.avatar_url,
        createdAt: selectedProfile.created_at,
        position: rankingIndex >= 0 ? rankingIndex + 1 : null,
        totalPoints,
        predictionsCount: userPredictions.length,
        scoredPredictionsCount: scoredPredictions.length,
        exactScores: scoredPredictions.filter(
          (prediction) => prediction.points === 5,
        ).length,
        correctGoalDifference: scoredPredictions.filter(
          (prediction) => prediction.points === 3,
        ).length,
        correctResult: scoredPredictions.filter(
          (prediction) => prediction.points === 2,
        ).length,
        zeroPoints: scoredPredictions.filter(
          (prediction) => prediction.points === 0,
        ).length,
        averagePoints:
          scoredPredictions.length > 0
            ? totalPoints / scoredPredictions.length
            : 0,
        bestScore:
          scoredPredictions.length > 0
            ? Math.max(
                ...scoredPredictions.map(
                  (prediction) => prediction.points ?? 0,
                ),
              )
            : 0,
        season,
      });

      setLoading(false);
    }

    loadPublicProfile();
  }, [profileId]);

  const initials = useMemo(() => {
    if (!profile?.name) return "?";

    return profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [profile?.name]);

  const achievements = useMemo<Achievement[]>(() => {
    if (!profile) return [];

    return [
      {
        icon: "🎯",
        title: "Eerste voorspelling",
        description: "Minstens één voorspelling ingevuld.",
        unlocked: profile.predictionsCount >= 1,
        progress: profile.predictionsCount,
        target: 1,
      },
      {
        icon: "🔟",
        title: "10 voorspellingen",
        description: "Tien voorspellingen ingevuld.",
        unlocked: profile.predictionsCount >= 10,
        progress: profile.predictionsCount,
        target: 10,
      },
      {
        icon: "💎",
        title: "5 exacte uitslagen",
        description: "Vijf keer de exacte score voorspeld.",
        unlocked: profile.exactScores >= 5,
        progress: profile.exactScores,
        target: 5,
      },
      {
        icon: "💯",
        title: "100 punten",
        description: "Honderd punten verzameld.",
        unlocked: profile.totalPoints >= 100,
        progress: profile.totalPoints,
        target: 100,
      },
      {
        icon: "🏅",
        title: "10 exacte uitslagen",
        description: "Tien keer de exacte score voorspeld.",
        unlocked: profile.exactScores >= 10,
        progress: profile.exactScores,
        target: 10,
      },
      {
        icon: "📚",
        title: "50 voorspellingen",
        description: "Vijftig voorspellingen ingevuld.",
        unlocked: profile.predictionsCount >= 50,
        progress: profile.predictionsCount,
        target: 50,
      },
      {
        icon: "🥉",
        title: "Top 3",
        description: "Een plaats bij de beste drie.",
        unlocked:
          profile.position !== null &&
          profile.position >= 1 &&
          profile.position <= 3,
        progress:
          profile.position !== null && profile.position <= 3 ? 1 : 0,
        target: 1,
      },
      {
        icon: "👑",
        title: "Leider",
        description: "De eerste plaats in het klassement.",
        unlocked: profile.position === 1,
        progress: profile.position === 1 ? 1 : 0,
        target: 1,
      },
    ];
  }, [profile]);

  const seasonSummary = useMemo(() => {
    if (!profile || profile.season.length === 0) return null;

    const highestRanking = Math.min(
      ...profile.season.map((point) => point.position),
    );
    const biggestClimb = profile.season.reduce((best, point, index) => {
      if (index === 0) return best;

      const previousPosition = profile.season[index - 1].position;
      return Math.max(best, previousPosition - point.position);
    }, 0);
    const bestMatchday = profile.season.reduce(
      (best, point) =>
        point.pointsGained > best.pointsGained ? point : best,
      profile.season[0],
    );

    return {
      highestRanking,
      biggestClimb,
      latestPoints: profile.season.at(-1)?.totalPoints ?? 0,
      bestMatchday,
    };
  }, [profile]);

  function formatMemberSince(value: string | null) {
    if (!value) return "Onbekend";

    return new Intl.DateTimeFormat("nl-BE", {
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">Profiel laden...</p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage || !profile) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <h1 className="text-2xl font-black text-white">
              Profiel niet beschikbaar
            </h1>
            <p className="mt-2 text-rose-300">
              {errorMessage || "Dit profiel bestaat niet."}
            </p>
            <Link href="/klassement" className="ucl-button-secondary mt-5">
              ← Terug naar klassement
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const isOwnProfile = currentUserId === profile.id;

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/klassement" className="ucl-button-secondary">
            ← Terug naar klassement
          </Link>

          {isOwnProfile && (
            <Link href="/profiel" className="ucl-button-primary">
              ✏️ Mijn profiel bewerken
            </Link>
          )}
        </div>

        <section className="ucl-card mb-8 overflow-hidden">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-sky-300/30 bg-gradient-to-br from-sky-500/25 to-indigo-500/20 text-4xl font-black text-white shadow-xl shadow-sky-950/30">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`Profielfoto van ${profile.name}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">
                Openbaar spelersprofiel
              </p>
              <h1 className="mt-2 truncate text-3xl font-black text-white sm:text-4xl">
                {profile.name}
              </h1>
              <p className="mt-2 text-slate-400">
                Lid sinds {formatMemberSince(profile.createdAt)}
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Positie
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {profile.position ? `#${profile.position}` : "—"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Punten
                  </p>
                  <p className="mt-1 text-2xl font-black text-sky-300">
                    {profile.totalPoints}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Voorspellingen
                  </p>
                  <p className="mt-1 text-2xl font-black text-white">
                    {profile.predictionsCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-white">
              🎯 Pronostiekstatistieken
            </h2>
            <p className="ucl-muted">
              De prestaties van {profile.name} dit seizoen.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Totale punten" value={profile.totalPoints} />
            <StatCard label="Exacte scores" value={profile.exactScores} />
            <StatCard
              label="Juist doelpuntensaldo"
              value={profile.correctGoalDifference}
            />
            <StatCard
              label="Juiste winnaar/gelijkspel"
              value={profile.correctResult}
            />
            <StatCard
              label="Gemiddelde punten"
              value={profile.averagePoints.toFixed(2)}
            />
            <StatCard label="Beste voorspelling" value={profile.bestScore} />
            <StatCard
              label="Voorspellingen met punten"
              value={profile.scoredPredictionsCount}
            />
            <StatCard label="Nul punten" value={profile.zeroPoints} />
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-black text-white">
              🏅 Achievements
            </h2>
            <p className="ucl-muted">
              Ontgrendelde en toekomstige mijlpalen.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.map((achievement) => {
              const percentage = Math.min(
                (achievement.progress / achievement.target) * 100,
                100,
              );

              return (
                <article
                  key={achievement.title}
                  className={`rounded-2xl border p-4 ${
                    achievement.unlocked
                      ? "border-amber-300/30 bg-amber-400/10"
                      : "border-white/10 bg-white/5 opacity-65"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl">{achievement.icon}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider ${
                        achievement.unlocked
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/5 text-slate-500"
                      }`}
                    >
                      {achievement.unlocked ? "Behaald" : "Vergrendeld"}
                    </span>
                  </div>

                  <h3 className="mt-3 font-black text-white">
                    {achievement.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {achievement.description}
                  </p>

                  {!achievement.unlocked && (
                    <div className="mt-4">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-sky-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-500">
                        {Math.min(achievement.progress, achievement.target)} /{" "}
                        {achievement.target}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-black text-white">
              📈 Seizoensevolutie
            </h2>
            <p className="ucl-muted">
              Punten en positie per opgeslagen speeldag.
            </p>
          </div>

          {!seasonSummary || profile.season.length < 2 ? (
            <div className="ucl-card">
              <p className="ucl-muted">
                Er zijn nog onvoldoende rankingsnapshots om een evolutie te
                tonen.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Hoogste ranking"
                  value={`#${seasonSummary.highestRanking}`}
                />
                <StatCard
                  label="Grootste stijging"
                  value={`+${seasonSummary.biggestClimb}`}
                />
                <StatCard
                  label="Laatste puntenstand"
                  value={seasonSummary.latestPoints}
                />
                <StatCard
                  label="Beste speeldag"
                  value={`SD ${seasonSummary.bestMatchday.speeldag} (+${seasonSummary.bestMatchday.pointsGained})`}
                />
              </div>

              <div className="ucl-card overflow-x-auto">
                <div className="min-w-[620px]">
                  <div className="flex h-64 items-end gap-3 border-b border-white/10 px-2 pb-3">
                    {profile.season.map((point) => {
                      const maxPoints = Math.max(
                        ...profile.season.map(
                          (seasonPoint) => seasonPoint.totalPoints,
                        ),
                        1,
                      );
                      const height = Math.max(
                        (point.totalPoints / maxPoints) * 100,
                        5,
                      );

                      return (
                        <div
                          key={point.speeldag}
                          className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        >
                          <span className="text-xs font-black text-sky-300">
                            {point.totalPoints}
                          </span>
                          <div
                            className="w-full max-w-10 rounded-t-lg bg-sky-400/70"
                            style={{ height: `${height}%` }}
                            title={`Speeldag ${point.speeldag}: ${point.totalPoints} punten, positie ${point.position}`}
                          />
                          <span className="text-[10px] font-bold text-slate-500">
                            SD {point.speeldag}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </article>
  );
}
