"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Profile = {
  id: string;
  name: string;
  created_at: string | null;
};

type Prediction = {
  user_id: string;
  points: number | null;
};

type PronostiekStats = {
  predictionsCount: number;
  scoredPredictionsCount: number;
  exactScores: number;
  correctGoalDifference: number;
  correctResult: number;
  zeroPoints: number;
  averagePoints: number;
  bestScore: number;
};

type ProfileSummary = {
  name: string;
  createdAt: string | null;
  position: number | null;
  totalPoints: number;
  pointsToNextPosition: number | null;
  pronostiek: PronostiekStats;
};

type Achievement = {
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
};

export default function ProfielPage() {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setErrorMessage("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        window.location.href = "/login?reason=login-required";
        return;
      }

      const userId = userData.user.id;

      const [profilesResult, predictionsResult] = await Promise.all([
        supabase.from("profiles").select("id, name, created_at"),
        supabase.from("predictions").select("user_id, points"),
      ]);

      if (profilesResult.error) {
        setErrorMessage(profilesResult.error.message);
        setLoading(false);
        return;
      }

      if (predictionsResult.error) {
        setErrorMessage(predictionsResult.error.message);
        setLoading(false);
        return;
      }

      const profiles = (profilesResult.data ?? []) as Profile[];
      const predictions = (predictionsResult.data ?? []) as Prediction[];
      const currentProfile = profiles.find((item) => item.id === userId);

      if (!currentProfile) {
        setErrorMessage("Je profiel kon niet worden gevonden.");
        setLoading(false);
        return;
      }

      const ranking = profiles
        .map((item) => {
          const totalPoints = predictions
            .filter((prediction) => prediction.user_id === item.id)
            .reduce(
              (sum, prediction) => sum + (prediction.points ?? 0),
              0,
            );

          return {
            userId: item.id,
            totalPoints,
          };
        })
        .sort((a, b) => b.totalPoints - a.totalPoints);

      const currentRankingIndex = ranking.findIndex(
        (item) => item.userId === userId,
      );

      const currentRanking = ranking.find(
        (item) => item.userId === userId,
      );

      const userPredictions = predictions.filter(
        (prediction) => prediction.user_id === userId,
      );

      const scoredPredictions = userPredictions.filter(
        (prediction) => prediction.points !== null,
      );

      const totalPoints = currentRanking?.totalPoints ?? 0;
      const bestScore =
        scoredPredictions.length > 0
          ? Math.max(
              ...scoredPredictions.map(
                (prediction) => prediction.points ?? 0,
              ),
            )
          : 0;

      const pointsToNextPosition =
        currentRankingIndex > 0
          ? Math.max(
              ranking[currentRankingIndex - 1].totalPoints - totalPoints,
              0,
            )
          : null;

      setProfile({
        name: currentProfile.name,
        createdAt: currentProfile.created_at,
        position:
          currentRankingIndex >= 0 ? currentRankingIndex + 1 : null,
        totalPoints,
        pointsToNextPosition,
        pronostiek: {
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
          bestScore,
        },
      });

      setLoading(false);
    }

    loadProfile();
  }, []);

  const initials = useMemo(() => {
    if (!profile?.name) return "?";

    return profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }, [profile?.name]);

  const firstName = useMemo(() => {
    if (!profile?.name) return "";

    return profile.name.trim().split(/\s+/)[0];
  }, [profile?.name]);

  const achievements = useMemo<Achievement[]>(() => {
    if (!profile) return [];

    return [
      {
        icon: "⚽",
        title: "De eerste stap",
        description: "Vul je eerste pronostiek in.",
        unlocked: profile.pronostiek.predictionsCount >= 1,
        progress: profile.pronostiek.predictionsCount,
        target: 1,
      },
      {
        icon: "📝",
        title: "Vaste waarde",
        description: "Vul 10 pronostieken in.",
        unlocked: profile.pronostiek.predictionsCount >= 10,
        progress: profile.pronostiek.predictionsCount,
        target: 10,
      },
      {
        icon: "🎯",
        title: "Scherpschutter",
        description: "Voorspel 5 exacte uitslagen.",
        unlocked: profile.pronostiek.exactScores >= 5,
        progress: profile.pronostiek.exactScores,
        target: 5,
      },
      {
        icon: "💯",
        title: "Eeuweling",
        description: "Behaal in totaal 100 punten.",
        unlocked: profile.totalPoints >= 100,
        progress: profile.totalPoints,
        target: 100,
      },
      {
        icon: "🔥",
        title: "Topvorm",
        description: "Voorspel 10 exacte uitslagen.",
        unlocked: profile.pronostiek.exactScores >= 10,
        progress: profile.pronostiek.exactScores,
        target: 10,
      },
      {
        icon: "📚",
        title: "Doorgewinterd",
        description: "Vul 50 pronostieken in.",
        unlocked: profile.pronostiek.predictionsCount >= 50,
        progress: profile.pronostiek.predictionsCount,
        target: 50,
      },
      {
        icon: "🥉",
        title: "Podiumplaats",
        description: "Sta in de top 3 van het klassement.",
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
        title: "Koploper",
        description: "Sta op de eerste plaats.",
        unlocked: profile.position === 1,
        progress: profile.position === 1 ? 1 : 0,
        target: 1,
      },
    ];
  }, [profile]);

  const unlockedAchievements = achievements.filter(
    (achievement) => achievement.unlocked,
  ).length;

  function formatMemberSince(value: string | null) {
    if (!value) return "Onbekend";

    return new Intl.DateTimeFormat("nl-BE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  }

  function formatAverage(value: number) {
    return new Intl.NumberFormat("nl-BE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <section className="ucl-card">
            <p className="ucl-muted">Profiel laden...</p>
          </section>
        </div>
      </main>
    );
  }

  if (errorMessage || !profile) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <section className="ucl-card text-center">
            <div className="text-4xl">⚠️</div>
            <h1 className="mt-4 text-2xl font-black text-white">
              Profiel niet beschikbaar
            </h1>
            <p className="mt-2 text-slate-300">
              {errorMessage || "Er ging iets mis bij het laden van je profiel."}
            </p>
            <a href="/" className="ucl-button-secondary mt-6">
              ← Terug naar dashboard
            </a>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-6">
          <a href="/" className="ucl-button-secondary">
            ← Terug naar dashboard
          </a>
        </div>

        <section className="ucl-card overflow-hidden">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-sky-300">
              Mijn profiel
            </p>

            <div className="mx-auto mt-5 flex h-28 w-28 items-center justify-center rounded-3xl border border-sky-300/30 bg-gradient-to-br from-sky-500/25 to-indigo-500/20 text-4xl font-black text-white shadow-xl shadow-sky-950/30">
              {initials}
            </div>

            <h1 className="mt-5 text-3xl font-black text-white">
              {profile.name}
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Lid sinds {formatMemberSince(profile.createdAt)}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5 text-center">
              <div className="text-3xl">🏆</div>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-amber-200">
                Huidige plaats
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {profile.position ? `#${profile.position}` : "—"}
              </p>
            </div>

            <div className="rounded-2xl border border-sky-300/20 bg-sky-500/10 p-5 text-center">
              <div className="text-3xl">⭐</div>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-sky-200">
                Totaal punten
              </p>
              <p className="mt-2 text-4xl font-black text-white">
                {profile.totalPoints}
              </p>
            </div>
          </div>
        </section>

        <section className="ucl-card mt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-500/10 text-2xl">
              👋
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Welkom terug, {firstName}!
              </h2>

              <p className="mt-2 leading-7 text-slate-300">
                Je staat momenteel{" "}
                <strong className="text-white">
                  {profile.position
                    ? `op plaats #${profile.position}`
                    : "in het klassement"}
                </strong>{" "}
                met{" "}
                <strong className="text-sky-300">
                  {profile.totalPoints} punten
                </strong>
                .
              </p>

              {profile.position === 1 ? (
                <p className="mt-2 font-bold text-amber-300">
                  👑 Jij staat momenteel aan de leiding!
                </p>
              ) : profile.pointsToNextPosition !== null ? (
                <p className="mt-2 text-sm font-semibold text-emerald-300">
                  Nog {profile.pointsToNextPosition}{" "}
                  {profile.pointsToNextPosition === 1 ? "punt" : "punten"} tot
                  de volgende plaats.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="ucl-card mt-6">
          <div className="mb-6">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">
              Statistieken
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              📊 Pronostiekstatistieken
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Een overzicht van al je voorspellingen en behaalde punten.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              icon="⚽"
              label="Ingevuld"
              value={profile.pronostiek.predictionsCount}
              accentClass="border-sky-300/20 bg-sky-500/10 text-sky-200"
            />

            <StatCard
              icon="⭐"
              label="Totaal punten"
              value={profile.totalPoints}
              accentClass="border-amber-300/20 bg-amber-500/10 text-amber-200"
            />

            <StatCard
              icon="🎯"
              label="Exacte uitslagen"
              value={profile.pronostiek.exactScores}
              detail="5 punten"
              accentClass="border-emerald-300/20 bg-emerald-500/10 text-emerald-200"
            />

            <StatCard
              icon="🥅"
              label="Doelpunten saldo"
              value={profile.pronostiek.correctGoalDifference}
              detail="3 punten"
              accentClass="border-cyan-300/20 bg-cyan-500/10 text-cyan-200"
            />

            <StatCard
              icon="👍"
              label="Juiste winnaar of gelijkspel"
              value={profile.pronostiek.correctResult}
              detail="2 punten"
              accentClass="border-indigo-300/20 bg-indigo-500/10 text-indigo-200"
            />

            <StatCard
              icon="📈"
              label="Gemiddelde punten"
              value={formatAverage(profile.pronostiek.averagePoints)}
              detail={`over ${profile.pronostiek.scoredPredictionsCount} beoordeelde voorspellingen`}
              accentClass="border-violet-300/20 bg-violet-500/10 text-violet-200"
            />

            <StatCard
              icon="🔥"
              label="Beste voorspelling"
              value={`${profile.pronostiek.bestScore} punten`}
              accentClass="border-orange-300/20 bg-orange-500/10 text-orange-200"
            />

            <StatCard
              icon="❌"
              label="Geen punten"
              value={profile.pronostiek.zeroPoints}
              detail="0 punten"
              accentClass="border-rose-300/20 bg-rose-500/10 text-rose-200"
            />
          </div>
        </section>

        <section className="ucl-card mt-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-300">
                Persoonlijke prestaties
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">
                🏅 Achievements
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Speel prestaties vrij met je pronostieken en je plaats in het
                klassement.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-5 py-3 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-200">
                Vrijgespeeld
              </p>
              <p className="mt-1 text-2xl font-black text-white">
                {unlockedAchievements} / {achievements.length}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {achievements.map((achievement) => (
              <AchievementCard
                key={achievement.title}
                achievement={achievement}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
  accentClass,
}: {
  icon: string;
  label: string;
  value: string | number;
  detail?: string;
  accentClass: string;
}) {
  return (
    <article className={`rounded-2xl border p-5 ${accentClass}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">
            {label}
          </p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
          {detail && (
            <p className="mt-2 text-xs font-semibold text-slate-400">
              {detail}
            </p>
          )}
        </div>

        <div className="text-3xl">{icon}</div>
      </div>
    </article>
  );
}

function AchievementCard({
  achievement,
}: {
  achievement: Achievement;
}) {
  const percentage = Math.min(
    100,
    Math.round((achievement.progress / achievement.target) * 100),
  );

  return (
    <article
      className={`rounded-2xl border p-5 transition ${
        achievement.unlocked
          ? "border-amber-300/30 bg-gradient-to-br from-amber-400/15 to-orange-500/10"
          : "border-white/10 bg-white/[0.03] opacity-70"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl ${
            achievement.unlocked
              ? "border-amber-300/30 bg-amber-400/15"
              : "border-white/10 bg-white/5 grayscale"
          }`}
        >
          {achievement.unlocked ? achievement.icon : "🔒"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-black text-white">{achievement.title}</h3>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                achievement.unlocked
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-white/5 text-slate-500"
              }`}
            >
              {achievement.unlocked ? "Behaald" : "Vergrendeld"}
            </span>
          </div>

          <p className="mt-1 text-sm leading-6 text-slate-400">
            {achievement.description}
          </p>

          {!achievement.unlocked && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-400">
                <span>Voortgang</span>
                <span>
                  {Math.min(achievement.progress, achievement.target)} /{" "}
                  {achievement.target}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
