"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import CollectivePitch from "@/components/coach/CollectivePitch";
import FormationStats from "@/components/coach/FormationStats";
import TopPlayersList from "@/components/coach/TopPlayersList";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getCoachMatch,
  type CoachMatch,
} from "@/src/lib/coach-match-editor";
import { getMatchCollectiveDashboard } from "@/src/lib/coach-match-collective";
import type { CollectiveDashboard } from "@/src/lib/coach";

function formatDate(value: string | null) {
  if (!value) {
    return "Nog geen inzendingen";
  }

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatKickoff(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MatchCollectiveLineupPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<CoachMatch | null>(null);
  const [dashboard, setDashboard] =
    useState<CollectiveDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        if (!Number.isInteger(matchId) || matchId <= 0) {
          throw new Error("Ongeldige wedstrijd.");
        }

        const [matchResult, teams] = await Promise.all([
          getCoachMatch(matchId),
          getActiveCoachTeams(),
        ]);

        if (!matchResult) {
          throw new Error("Deze wedstrijd werd niet gevonden.");
        }

        const team = teams[0];

        if (!team) {
          throw new Error(
            "Er is geen actief coachteam ingesteld.",
          );
        }

        const dashboardResult =
          await getMatchCollectiveDashboard(team.id, matchId);

        setMatch(matchResult);
        setDashboard(dashboardResult);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "De collectieve basiself kon niet worden geladen.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [matchId],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-amber-300/[0.07] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-200/70">
                Iedereen Coach
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Collectieve basiself
              </h1>

              {match ? (
                <>
                  <p className="mt-4 text-xl font-black text-white">
                    {match.home_team}
                    <span className="mx-3 text-amber-200/60">
                      VS
                    </span>
                    {match.away_team}
                  </p>

                  <p className="mt-2 text-sm font-bold capitalize text-white/45">
                    {formatKickoff(match.kickoff)}
                  </p>
                </>
              ) : null}
            </div>

            <button
              type="button"
              disabled={loading || refreshing}
              onClick={() => {
                void loadDashboard(true);
              }}
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing ? "Vernieuwen…" : "↻ Vernieuwen"}
            </button>
          </div>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white/50">
            Collectieve wedstrijdopstelling laden…
          </div>
        ) : dashboard ? (
          dashboard.total_coaches === 0 ? (
            <section className="mt-6 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
              <div className="text-5xl">👥</div>

              <h2 className="mt-4 text-2xl font-black">
                Nog geen collectieve basiself
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/50">
                Voor deze wedstrijd heeft nog niemand een volledige
                basiself definitief ingediend. Zodra de eerste inzending
                binnenkomt, verschijnt hier automatisch de collectieve
                opstelling.
              </p>

              <Link
                href={`/iedereen-coach/${matchId}`}
                className="mt-6 inline-flex rounded-2xl bg-white px-6 py-3 text-sm font-black text-black transition hover:bg-zinc-200"
              >
                Stel jouw basiself samen
              </Link>
            </section>
          ) : (
            <>
              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                    Coaches
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {dashboard.total_coaches}
                  </p>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                    Inzendingen
                  </p>
                  <p className="mt-2 text-4xl font-black">
                    {dashboard.total_submissions}
                  </p>
                </article>

                <article className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-100/65">
                    Favoriete formatie
                  </p>

                  <p className="mt-2 text-3xl font-black">
                    {dashboard.most_popular_formation
                      ?.formation_name ?? "—"}
                  </p>

                  <p className="mt-1 text-sm font-bold text-amber-200">
                    {dashboard.most_popular_formation
                      ?.percentage ?? 0}
                    %
                  </p>
                </article>

                <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/40">
                    Laatste update
                  </p>

                  <p className="mt-2 text-sm font-black leading-6">
                    {formatDate(
                      dashboard.latest_submission_at,
                    )}
                  </p>
                </article>
              </section>

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
                <CollectivePitch
                  formationName={
                    dashboard.most_popular_formation
                      ?.formation_name ?? "—"
                  }
                  players={dashboard.collective_lineup}
                />

                <FormationStats
                  formations={dashboard.formations}
                />
              </div>

              <div className="mt-6">
                <TopPlayersList
                  players={dashboard.top_players}
                />
              </div>
            </>
          )
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href={`/iedereen-coach/${matchId}`}
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
          >
            Mijn basiself
          </Link>

          <Link
            href="/iedereen-coach"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
          >
            Alle wedstrijden
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
