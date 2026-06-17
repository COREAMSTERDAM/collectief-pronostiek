"use client";

import { useEffect, useState } from "react";
import { supabase } from "../src/lib/supabase";

type DashboardStats = {
  name: string;
  position: number | null;
  points: number;
  openMatches: number;
  finishedMatches: number;
};

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    name: "",
    position: null,
    points: 0,
    openMatches: 0,
    finishedMatches: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name");

      const { data: predictions } = await supabase
        .from("predictions")
        .select("user_id, points");

      const { data: matches } = await supabase
        .from("matches")
        .select("status");

      const ranking =
        profiles?.map((profile) => {
          const totalPoints =
            predictions
              ?.filter((prediction) => prediction.user_id === profile.id)
              .reduce((sum, prediction) => sum + (prediction.points || 0), 0) ||
            0;

          return {
            id: profile.id,
            name: profile.name,
            totalPoints,
          };
        }) || [];

      ranking.sort((a, b) => b.totalPoints - a.totalPoints);

      const myIndex = ranking.findIndex(
        (player) => player.id === userData.user?.id
      );

      const myProfile = ranking[myIndex];

      setStats({
        name: myProfile?.name || "",
        position: myIndex >= 0 ? myIndex + 1 : null,
        points: myProfile?.totalPoints || 0,
        openMatches:
          matches?.filter((match) => match.status !== "afgewerkt").length || 0,
        finishedMatches:
          matches?.filter((match) => match.status === "afgewerkt").length || 0,
      });
    }

    loadDashboard();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-8">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-28 mx-auto mb-6"
        />

        <h1 className="text-3xl font-bold mb-2">
          Collectief Pronostiek
        </h1>

        <p className="text-slate-300 mb-6">
          {stats.name
            ? `Welkom ${stats.name}`
            : "Welkom in je pronostiek-dashboard."}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-slate-400 text-sm">Mijn positie</p>
            <p className="text-2xl font-bold">
              {stats.position ? `#${stats.position}` : "-"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-slate-400 text-sm">Mijn punten</p>
            <p className="text-2xl font-bold">
              {stats.points}
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-slate-400 text-sm">Open wedstrijden</p>
            <p className="text-2xl font-bold">
              {stats.openMatches}
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-slate-400 text-sm">Afgewerkt</p>
            <p className="text-2xl font-bold">
              {stats.finishedMatches}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <a
            href="/wedstrijden"
            className="block rounded-xl bg-white text-slate-950 p-4 font-semibold text-center"
          >
            ⚽ Wedstrijden
          </a>

          <a
            href="/klassement"
            className="block rounded-xl border border-slate-700 p-4 font-semibold text-center"
          >
            🏆 Klassement
          </a>

          <a
            href="/admin"
            className="block rounded-xl border border-slate-700 p-4 font-semibold text-center"
          >
            ⚙️ Admin
          </a>

          <button
            onClick={logout}
            className="w-full rounded-xl bg-red-900 p-4 font-semibold text-center"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </main>
  );
}