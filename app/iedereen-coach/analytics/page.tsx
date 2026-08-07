"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AnalyticsTrendList from "@/components/coach/AnalyticsTrendList";
import PlayerHeatmapList from "@/components/coach/PlayerHeatmapList";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getCommunityAnalytics,
  type CommunityAnalytics,
} from "@/src/lib/coach-analytics";

export default function CommunityAnalyticsPage() {
  const [analytics, setAnalytics] =
    useState<CommunityAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const teams = await getActiveCoachTeams();
      const team = teams[0];

      if (!team) {
        throw new Error("Er is geen actief coachteam ingesteld.");
      }

      const result = await getCommunityAnalytics(team.id);
      setAnalytics(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De analytics konden niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-emerald-300/[0.07] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
            Iederiejn Coach
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            Community Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
            Bekijk trends, positievoorkeuren en hoe jouw eigen basiself
            overeenkomt met de actuele communitykeuze.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            Analytics laden…
          </div>
        ) : analytics ? (
          analytics.total_coaches === 0 ? (
            <section className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <h2 className="text-2xl font-black">
                Nog onvoldoende data
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/45">
                Analytics verschijnen zodra supporters volledige basiselftallen
                indienen.
              </p>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-white/40">
                    Community
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {analytics.total_coaches}
                  </p>
                  <p className="mt-1 text-xs text-white/40">coaches</p>
                </article>

                <article className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-100/60">
                    Jouw overlap
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {analytics.personal_community_overlap.percentage}%
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    {analytics.personal_community_overlap.overlap_count} van{" "}
                    {analytics.personal_community_overlap.selected_count}
                  </p>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-wide text-white/40">
                    Veelzijdigste speler
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {analytics.most_versatile_player?.player_name ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-white/40">
                    {analytics.most_versatile_player?.distinct_positions ?? 0}{" "}
                    posities
                  </p>
                </article>

                
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-2">
                <AnalyticsTrendList
                  title="🔥 Grootste stijgers"
                  subtitle="Vergelijking van de laatste 7 dagen met de 7 dagen ervoor."
                  players={analytics.rising_players}
                  direction="up"
                />

                <AnalyticsTrendList
                  title="📉 Grootste dalers"
                  subtitle="Spelers die selectiepercentage verloren."
                  players={analytics.falling_players}
                  direction="down"
                />
              </div>

              <div className="mt-6">
                <PlayerHeatmapList players={analytics.player_heatmaps} />
              </div>
            </>
          )
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href="/iedereen-coach"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black hover:bg-white/10"
          >
            Mijn opstelling
          </Link>

          <Link
            href="/iedereen-coach/collectief"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black hover:bg-white/10"
          >
            Collectieve basiself
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
