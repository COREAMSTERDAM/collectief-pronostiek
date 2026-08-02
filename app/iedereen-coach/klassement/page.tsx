"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getMySeparateCoachScores,
  getSeparateCoachRanking,
  type MyCoachMatchScore,
  type SeparateCoachRanking,
} from "@/src/lib/separate-coach-ranking";

function formatPoints(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function SeparateCoachRankingPage() {
  const [ranking, setRanking] =
    useState<SeparateCoachRanking | null>(null);
  const [history, setHistory] = useState<MyCoachMatchScore[]>([]);
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
          getSeparateCoachRanking(team.id),
          getMySeparateCoachScores(team.id),
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
        if (mounted) {
          setLoading(false);
        }
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

          <h1 className="ucl-title mt-3">
            Coachklassement
          </h1>

          <p className="ucl-subtitle mx-auto max-w-3xl">
            Dit klassement staat volledig los van het pronostiekklassement.
            De punten zijn de opgetelde definitieve gemiddelde scores van
            de spelers uit je ingediende basiself.
          </p>
        </header>

        <section className="ucl-card mt-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
            Berekening
          </p>

          <p className="mt-2 text-sm font-semibold leading-6 text-white/55">
            Per wedstrijd worden alleen de spelers uit je definitief
            ingediende basiself meegeteld. Heeft een speler een definitief
            gemiddelde, dan wordt dat gemiddelde bij je wedstrijdscore
            opgeteld. Alle wedstrijdscores samen vormen je totaal.
          </p>
        </section>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">
              Coachklassement laden…
            </p>
          </section>
        ) : ranking && ranking.ranking.length > 0 ? (
          <>
            <section className="ucl-card mt-6 overflow-hidden !p-0">
              <div className="divide-y divide-white/10">
                {ranking.ranking.map((row) => (
                  <article
                    key={row.user_id}
                    className={`grid grid-cols-[3.25rem_3.5rem_minmax(0,1fr)_7rem] items-center gap-3 px-4 py-4 sm:grid-cols-[4rem_4rem_minmax(0,1fr)_9rem] ${
                      row.is_current_user
                        ? "bg-amber-300/[0.08]"
                        : ""
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-2xl font-black text-amber-200">
                        #{row.position}
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-xs font-black">
                      {row.avatar_url ? (
                        <img
                          src={row.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(row.coach_name)
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white sm:text-lg">
                        {row.coach_name}
                        {row.is_current_user ? (
                          <span className="ml-2 text-xs text-emerald-300">
                            jij
                          </span>
                        ) : null}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-white/40">
                        {row.scored_matches}{" "}
                        {row.scored_matches === 1
                          ? "wedstrijd"
                          : "wedstrijden"}
                        {" · "}
                        gemiddeld {formatPoints(row.average_points)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black tabular-nums text-white sm:text-3xl">
                        {formatPoints(row.total_points)}
                      </p>

                      <p className="text-[10px] font-black uppercase tracking-wide text-white/35">
                        coachpunten
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="ucl-card mt-6">
              <h2 className="text-2xl font-black text-white">
                Mijn wedstrijdscores
              </h2>

              <p className="ucl-subtitle">
                Bekijk hoeveel punten je per gefinaliseerde wedstrijd hebt
                verzameld.
              </p>

              {history.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                  <p className="text-sm font-semibold text-white/45">
                    Je hebt nog geen berekende coachscores.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {history.map((match) => (
                    <article
                      key={match.match_id}
                      className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-black text-white">
                          {match.home_team} – {match.away_team}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          {formatDate(match.kickoff)}
                          {" · "}
                          {match.scored_player_count} van{" "}
                          {match.selected_player_count} spelers hadden een
                          gemiddelde
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black tabular-nums text-amber-200">
                          {formatPoints(match.score)}
                        </p>

                        <p className="text-[10px] font-black uppercase tracking-wide text-white/30">
                          punten
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="ucl-card mt-6 text-center">
            <div className="text-4xl">🏆</div>

            <h2 className="mt-4 text-xl font-black text-white">
              Nog geen coachscores
            </h2>

            <p className="ucl-subtitle">
              Zodra een wedstrijd is gefinaliseerd en de coachscores zijn
              berekend, verschijnt het aparte coachklassement hier.
            </p>
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/iedereencoachkeuze"
            className="ucl-button-secondary"
          >
            ← Terug naar Iedereen Coach
          </Link>

          <Link
            href="/klassement"
            className="ucl-button-secondary"
          >
            Gewoon pronostiekklassement
          </Link>
        </div>
      </div>
    </main>
  );
}
