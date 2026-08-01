"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getCoachRanking,
  getMyCoachScoreHistory,
  type CoachRanking,
  type CoachScoreHistoryRow,
} from "@/src/lib/coach-ranking";

function formatScore(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export default function CoachRankingPage() {
  const [ranking, setRanking] = useState<CoachRanking | null>(null);
  const [history, setHistory] = useState<CoachScoreHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setErrorMessage("");

        const teams = await getActiveCoachTeams();
        const team = teams[0];

        if (!team) {
          throw new Error("Er is geen actief coachteam ingesteld.");
        }

        const [rankingResult, historyResult] = await Promise.all([
          getCoachRanking(team.id),
          getMyCoachScoreHistory(team.id),
        ]);

        if (!mounted) return;

        setRanking(rankingResult);
        setHistory(historyResult);
      } catch (error) {
        if (!mounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Het coachklassement kon niet worden geladen.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Iedereen Coach
          </p>
          <h1 className="ucl-title mt-3">Coachklassement</h1>
          <p className="ucl-subtitle">
            Alle definitieve wedstrijdscores worden over het hele seizoen
            opgeteld.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">Klassement laden…</p>
          </section>
        ) : ranking && ranking.ranking.length > 0 ? (
          <>
            <section className="ucl-card mt-6 overflow-hidden !p-0">
              <div className="divide-y divide-white/10">
                {ranking.ranking.map((row) => (
                  <article
                    key={row.user_id}
                    className={`grid gap-4 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                      row.is_current_user
                        ? "bg-amber-300/[0.08]"
                        : ""
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-3xl font-black text-amber-200">
                        #{row.position}
                      </p>
                    </div>

                    <div>
                      <p className="cp-account-name text-white">
                        {row.coach_name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-white/40">
                        {row.scored_matches} verwerkte wedstrijden · gemiddeld{" "}
                        {formatScore(row.average_match_score)}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-3xl font-black text-white">
                        {formatScore(row.total_score)}
                      </p>
                      <p className="text-xs font-bold uppercase tracking-wide text-white/35">
                        punten
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="ucl-card mt-6">
              <h2 className="text-2xl font-black">Mijn puntenhistoriek</h2>

              {history.length === 0 ? (
                <p className="ucl-subtitle">
                  Je hebt nog geen verwerkte wedstrijdscores.
                </p>
              ) : (
                <div className="mt-5 space-y-3">
                  {history.map((match) => (
                    <article
                      key={match.match_id}
                      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black">
                          {match.home_team} – {match.away_team}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {match.scored_player_count} van{" "}
                          {match.selected_player_count} spelers scoorden punten
                        </p>
                      </div>

                      <p className="text-2xl font-black text-amber-200">
                        {formatScore(match.score)}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="ucl-card mt-6 text-center">
            <h2 className="text-xl font-black">Nog geen coachscores</h2>
            <p className="ucl-subtitle">
              Zodra een wedstrijd is gefinaliseerd, verschijnen de eerste
              punten hier automatisch.
            </p>
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/iedereen-coach" className="ucl-button-secondary">
            ← Terug naar Iedereen Coach
          </Link>
          <Link
            href="/iedereen-coach/spelershistoriek"
            className="ucl-button-secondary"
          >
            Puntenhistoriek spelers
          </Link>
        </div>
      </div>
    </main>
  );
}
