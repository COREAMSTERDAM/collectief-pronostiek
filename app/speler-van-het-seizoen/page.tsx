"use client";

import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/src/lib/supabase";
import {
  buildSeasonStandings,
  getSeasonPlayers,
  getSeasonRankingRows,
  type SeasonPlayer,
  type SeasonRankingRow,
  type SeasonStanding,
} from "@/src/lib/season-player";

import SeasonStandings from "@/components/season-player/SeasonStandings";

export default function SpelerVanHetSeizoenPage() {
  const [standings, setStandings] = useState<SeasonStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadStandings = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setErrorMessage("");

    const [
      { data: playerData, error: playerError },
      { data: rankingData, error: rankingError },
    ] = await Promise.all([
      getSeasonPlayers(),
      getSeasonRankingRows(),
    ]);

    if (playerError || rankingError) {
      const error = playerError ?? rankingError;

      console.error("Seizoensklassement laden mislukt:", {
        playerError,
        rankingError,
      });

      setErrorMessage(
        error?.message ||
          "Het seizoensklassement kon niet worden geladen.",
      );

      setLoading(false);
      setRefreshing(false);
      return;
    }

    setStandings(
      buildSeasonStandings(
        (playerData ?? []) as SeasonPlayer[],
        (rankingData ?? []) as SeasonRankingRow[],
      ),
    );

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadStandings(true);
  }, [loadStandings]);

  useEffect(() => {
    const channel = supabase
      .channel("season-player-standings")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_rankings",
        },
        () => {
          void loadStandings();
        },
      )
      .subscribe();

    const fallbackInterval = window.setInterval(() => {
      void loadStandings();
    }, 60000);

    return () => {
      window.clearInterval(fallbackInterval);
      void supabase.removeChannel(channel);
    };
  }, [loadStandings]);

  const leader = standings[0] ?? null;
  const totalVotes = standings.reduce(
    (sum, standing) => sum + standing.totalVotes,
    0,
  );
  const totalMatches = Math.max(
    ...standings.map((standing) => standing.matchesWithVotes),
    0,
  );

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-300">
              Seizoensklassement
            </p>

            <h1 className="ucl-title mt-2">
              Speler van het Seizoen
            </h1>

            <p className="mt-4 max-w-2xl font-semibold text-white/55">
              De punten uit alle Man van de Wedstrijd-stemmingen
              worden hier automatisch samengevoegd.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadStandings();
            }}
            disabled={refreshing}
            className="inline-flex h-10 w-fit items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {refreshing ? "Vernieuwen..." : "↻ Vernieuwen"}
          </button>
        </div>

        {!loading && !errorMessage && standings.length > 0 && (
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="ucl-card-dark p-5">
              <p className="text-xs font-black uppercase tracking-wider text-white/40">
                Leider
              </p>
              <p className="mt-2 truncate text-xl font-black text-white">
                {leader?.name}
              </p>
              <p className="mt-1 font-black text-sky-300">
                {leader?.points} punten
              </p>
            </div>

            <div className="ucl-card-dark p-5">
              <p className="text-xs font-black uppercase tracking-wider text-white/40">
                Stemregels
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {totalVotes}
              </p>
              <p className="mt-1 font-semibold text-white/45">
                uitgebrachte plaatsstemmen
              </p>
            </div>

            <div className="ucl-card-dark p-5">
              <p className="text-xs font-black uppercase tracking-wider text-white/40">
                Wedstrijden
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {totalMatches}
              </p>
              <p className="mt-1 font-semibold text-white/45">
                met stemmen voor de leider
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="ucl-card-dark mt-8 p-7">
            <p className="font-bold text-white/60">
              Het seizoensklassement wordt geladen...
            </p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
            <p className="font-bold text-red-200">
              {errorMessage}
            </p>
          </div>
        )}

        {!loading && !errorMessage && (
          <div className="mt-8">
            <SeasonStandings standings={standings.slice(0, 10)} />
          </div>
        )}
      </div>
    </main>
  );
}
