"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import CollectivePitch from "@/components/coach/CollectivePitch";
import FormationStats from "@/components/coach/FormationStats";
import TopPlayersList from "@/components/coach/TopPlayersList";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getAllMatchesCollectiveDashboard,
  type AllMatchesCollectiveDashboard,
} from "@/src/lib/coach-all-matches";

function formatDate(value: string | null) {
  if (!value) return "Nog geen data";

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AllMatchesCollectivePage() {
  const [dashboard, setDashboard] =
    useState<AllMatchesCollectiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const teams = await getActiveCoachTeams();
      const team = teams[0];

      if (!team) {
        throw new Error("Er is geen actief coachteam ingesteld.");
      }

      const result = await getAllMatchesCollectiveDashboard(team.id);
      setDashboard(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Het totaaloverzicht kon niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-amber-300/[0.07] p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Iedereen Coach
          </p>

          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            Totaaloverzicht
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
            Samenvatting van alle definitieve wedstrijdopstellingen over
            alle wedstrijden heen.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            Totaaloverzicht laden…
          </div>
        ) : dashboard ? (
          dashboard.total_match_lineups === 0 ? (
            <section className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center">
              <h2 className="text-2xl font-black">
                Nog geen wedstrijddata
              </h2>
              <p className="mt-3 text-sm text-white/45">
                Zodra volledige wedstrijdopstellingen zijn ingediend,
                verschijnt hier het totaaloverzicht.
              </p>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase text-white/40">
                    Unieke coaches
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {dashboard.unique_coaches}
                  </p>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase text-white/40">
                    Wedstrijdopstellingen
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {dashboard.total_match_lineups}
                  </p>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase text-white/40">
                    Wedstrijden met data
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {dashboard.matches_with_data}
                  </p>
                </article>

                <article className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
                  <p className="text-xs font-black uppercase text-amber-100/60">
                    Favoriete formatie
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {dashboard.most_popular_formation?.formation_name ?? "—"}
                  </p>
                  <p className="mt-1 text-sm font-bold text-amber-200">
                    {dashboard.most_popular_formation?.percentage ?? 0}%
                  </p>
                </article>
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
                <CollectivePitch
                  formationName={
                    dashboard.most_popular_formation?.formation_name ?? "—"
                  }
                  players={dashboard.collective_lineup}
                />

                <FormationStats formations={dashboard.formations} />
              </div>

              <div className="mt-6">
                <TopPlayersList players={dashboard.top_players} />
              </div>

              <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h2 className="text-xl font-black">
                  Overzicht per wedstrijd
                </h2>

                <div className="mt-5 space-y-3">
                  {dashboard.matches.map((match) => (
                    <Link
                      key={match.match_id}
                      href={`/iedereen-coach/${match.match_id}/collectief`}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-amber-300/30 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black">
                          {match.home_team} – {match.away_team}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {formatDate(match.kickoff)}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="font-black text-amber-200">
                          {match.coach_count} coaches
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {match.lineup_count} opstellingen
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/iedereen-coach"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black hover:bg-white/10"
          >
            ← Terug naar wedstrijden
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
