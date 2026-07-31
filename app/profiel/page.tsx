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

type ProfileSummary = {
  name: string;
  createdAt: string | null;
  position: number | null;
  totalPoints: number;
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

      setProfile({
        name: currentProfile.name,
        createdAt: currentProfile.created_at,
        position:
          currentRankingIndex >= 0 ? currentRankingIndex + 1 : null,
        totalPoints: currentRanking?.totalPoints ?? 0,
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

  function formatMemberSince(value: string | null) {
    if (!value) return "Onbekend";

    return new Intl.DateTimeFormat("nl-BE", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
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

        <section className="mt-6 grid gap-4">
          <ComingSoonCard
            icon="📊"
            title="Pronostiekstatistieken"
            description="Binnenkort zie je hier al je persoonlijke pronostiekcijfers."
          />

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
