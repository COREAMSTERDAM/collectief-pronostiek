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
                  {profile.position ? `op plaats #${profile.position}` : "in het klassement"}
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
              Fase 2
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
              label="Voorspellingen ingevuld"
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
              label="Juist doelpuntensaldo"
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

        <section className="mt-6 grid gap-4">
          <ComingSoonCard
            icon="⭐"
            title="MOTM-statistieken"
            description="Binnenkort zie je hier je stemmen en favoriete spelers."
          />

          <ComingSoonCard
            icon="🏅"
            title="Achievements"
            description="Binnenkort verschijnen hier je vrijgespeelde prestaties."
          />
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

function ComingSoonCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <article className="ucl-card flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
        {icon}
      </div>

      <div className="min-w-0">
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">
          {description}
        </p>
      </div>

      <span className="ml-auto hidden shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-400 sm:inline-block">
        Binnenkort
      </span>
    </article>
  );
}