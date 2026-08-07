"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import CoachMatchCard from "@/components/coach/CoachMatchCard";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getCoachMatchOverview,
  type CoachMatchOverview,
} from "@/src/lib/coach-match";

export default function IedereenCoachPage() {
  const [matches, setMatches] = useState<CoachMatchOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const loadMatches = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");

      const teams = await getActiveCoachTeams();
      const team = teams[0];

      if (!team) {
        throw new Error(
          "Er is geen actief team ingesteld voor Iedereen Coach.",
        );
      }

      const result = await getCoachMatchOverview(team.id);
      setMatches(result);
      setNow(Date.now());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De wedstrijden konden niet worden geladen.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadMatches]);

  const summary = useMemo(() => {
    return matches.reduce(
      (result, match) => {
        const deadlineHasPassed =
          new Date(match.deadline).getTime() <= now || !match.is_open;

        if (deadlineHasPassed) {
          result.closed += 1;
        } else {
          result.open += 1;
        }

        if (match.has_lineup) {
          result.started += 1;
        }

        if (match.is_complete) {
          result.complete += 1;
        }

        return result;
      },
      {
        open: 0,
        closed: 0,
        started: 0,
        complete: 0,
      },
    );
  }, [matches, now]);

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-emerald-300/[0.07] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-200/70">
                Iendracht Manager 26
              </p>

              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
                Iederiejn Coach
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
                Stel per wedstrijd jouw ideale basiself samen. Aanpassen en
                indienen kan tot twee uur voor de aftrap.
              </p>
            </div>

            <button
              type="button"
              disabled={loading || refreshing}
              onClick={() => {
                void loadMatches(true);
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
            Wedstrijden laden…
          </div>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
              <article className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-100/60">
                  Open
                </p>
                <p className="mt-2 text-3xl font-black">
                  {summary.open}
                </p>
              </article>

              <article className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-100/60">
                  Gestart
                </p>
                <p className="mt-2 text-3xl font-black">
                  {summary.started}
                </p>
              </article>

              <article className="rounded-3xl border border-emerald-300/20 bg-emerald-400/10 p-5">
                <p className="text-xs font-black uppercase tracking-wide text-emerald-100/60">
                  Volledig
                </p>
                <p className="mt-2 text-3xl font-black">
                  {summary.complete}
                </p>
              </article>

              <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs font-black uppercase tracking-wide text-white/40">
                  Gesloten
                </p>
                <p className="mt-2 text-3xl font-black">
                  {summary.closed}
                </p>
              </article>
            </section>

            {matches.length === 0 ? (
              <section className="mt-6 rounded-3xl border border-dashed border-white/15 bg-white/[0.025] p-8 text-center">
                <div className="text-5xl">📅</div>
                <h2 className="mt-4 text-2xl font-black">
                  Geen wedstrijden beschikbaar
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/45">
                  Zodra er wedstrijden in de database staan, verschijnen ze
                  hier automatisch.
                </p>
              </section>
            ) : (
              <section className="mt-6 grid gap-6 lg:grid-cols-2">
                {matches.map((match) => (
                  <CoachMatchCard
                    key={match.match_id}
                    match={match}
                    now={now}
                  />
                ))}
              </section>
            )}
          </>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Link
            href="/iedereen-coach/collectief"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
          >
            Collectieve basiself
          </Link>

          <Link
            href="/iedereen-coach/analytics"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
          >
            Statistieken
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-center text-sm font-black transition hover:bg-white/10"
          >
            Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
