"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getPlayerRatingHistoryOverview,
  type PlayerRatingHistoryOverviewRow,
} from "@/src/lib/player-rating-history";

function formatScore(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export default function PlayerHistoryOverviewPage() {
  const [players, setPlayers] = useState<PlayerRatingHistoryOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        const teams = await getActiveCoachTeams();
        const team = teams[0];

        if (!team) {
          throw new Error("Er is geen actief coachteam ingesteld.");
        }

        const result = await getPlayerRatingHistoryOverview(team.id);

        if (mounted) setPlayers(result);
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "De spelershistoriek kon niet worden geladen.",
          );
        }
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
      <div className="ucl-container !max-w-5xl">
        <header className="ucl-card text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
            Iedereen Coach
          </p>
          <h1 className="ucl-title mt-3">Puntenhistoriek spelers</h1>
          <p className="ucl-subtitle">
            Bekijk de gemiddelde cijfers van alle spelers over afgewerkte
            wedstrijden.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">Spelershistoriek laden…</p>
          </section>
        ) : players.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <h2 className="text-xl font-black">Nog geen definitieve cijfers</h2>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:grid-cols-2">
            {players.map((player) => (
              <Link
                key={player.player_id}
                href={`/iedereen-coach/spelershistoriek/${player.player_id}`}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:border-emerald-300/25"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-sm font-black">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      player.player_name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-black text-white">
                      {player.player_name}
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      {player.finished_matches} wedstrijden ·{" "}
                      {player.total_votes} stemmen
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-3xl font-black text-emerald-200">
                      {formatScore(player.overall_average)}
                    </p>
                    <p className="text-[10px] font-black uppercase text-white/35">
                      gemiddelde
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/iedereen-coach" className="ucl-button-secondary">
            ← Terug naar Iedereen Coach
          </Link>
          <Link
            href="/iedereen-coach/klassement"
            className="ucl-button-secondary"
          >
            Coachklassement
          </Link>
        </div>
      </div>
    </main>
  );
}
