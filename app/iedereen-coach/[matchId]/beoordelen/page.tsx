"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PlayerRatingCard from "@/components/coach/PlayerRatingCard";
import RatingDeadline from "@/components/coach/RatingDeadline";
import {
  getMyMatchRatings,
  savePlayerMatchRating,
  type MatchRatingsOverview,
} from "@/src/lib/coach-ratings";
import {
  getCoachMatch,
  type CoachMatch,
} from "@/src/lib/coach-match-editor";

export default function MatchRatingsPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<CoachMatch | null>(null);
  const [overview, setOverview] =
    useState<MatchRatingsOverview | null>(null);
  const [savingPlayerId, setSavingPlayerId] =
    useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const ratedCount = useMemo(
    () =>
      overview?.players.filter(
        (player) => player.my_rating !== null,
      ).length ?? 0,
    [overview],
  );

  const totalPlayers = overview?.players.length ?? 0;
  const progress =
    totalPlayers === 0 ? 0 : (ratedCount / totalPlayers) * 100;

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      if (!Number.isInteger(matchId) || matchId <= 0) {
        throw new Error("Ongeldige wedstrijd.");
      }

      const [matchResult, ratingResult] = await Promise.all([
        getCoachMatch(matchId),
        getMyMatchRatings(matchId),
      ]);

      if (!matchResult) {
        throw new Error("Deze wedstrijd werd niet gevonden.");
      }

      setMatch(matchResult);
      setOverview(ratingResult);
      setNow(Date.now());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De beoordelingspagina kon niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadPage();

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadPage]);

  async function handleRatingChange(
    playerId: number,
    rating: number,
  ) {
    if (!overview?.is_open || savingPlayerId !== null) {
      return;
    }

    const roundedRating = Math.round(rating * 10) / 10;

    setOverview((current) =>
      current
        ? {
            ...current,
            players: current.players.map((player) =>
              player.player_id === playerId
                ? { ...player, my_rating: roundedRating }
                : player,
            ),
          }
        : current,
    );

    try {
      setSavingPlayerId(playerId);
      setErrorMessage("");
      setSuccessMessage("");

      await savePlayerMatchRating({
        matchId,
        playerId,
        rating: roundedRating,
      });

      setSuccessMessage("✅ Cijfer opgeslagen.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Het cijfer kon niet worden opgeslagen.",
      );

      await loadPage();
    } finally {
      setSavingPlayerId(null);
    }
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container !max-w-4xl">
          <section className="ucl-card text-center">
            <p className="ucl-subtitle">
              Spelersbeoordelingen laden…
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-4xl">
        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        {match && overview ? (
          <>
            <header className="ucl-card text-center">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
                Iedereen Coach
              </p>

              <h1 className="ucl-title mt-3">
                Spelers beoordelen
              </h1>

              <p className="mt-4 text-xl font-black">
                {match.home_team}
                <span className="mx-3 text-amber-200/60">
                  VS
                </span>
                {match.away_team}
              </p>
            </header>

            <div className="mt-6">
              <RatingDeadline
                deadline={overview.deadline}
                isOpen={overview.is_open}
                isFinalized={overview.is_finalized}
                now={now}
              />
            </div>

            <section className="ucl-card mt-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                    Voortgang
                  </p>
                  <h2 className="mt-1 text-xl font-black">
                    {ratedCount} van {totalPlayers} spelers beoordeeld
                  </h2>
                </div>

                <span className="text-2xl font-black text-amber-200">
                  {Math.round(progress)}%
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white to-amber-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            {overview.players.length === 0 ? (
              <section className="ucl-card mt-6 text-center">
                <h2 className="text-xl font-black">
                  Nog geen actieve spelers
                </h2>
                <p className="ucl-subtitle">
                  De admin moet eerst aanduiden welke spelers in deze
                  wedstrijd actief waren.
                </p>
              </section>
            ) : (
              <section className="mt-6 space-y-4">
                {overview.players.map((player) => (
                  <PlayerRatingCard
                    key={player.player_id}
                    player={player}
                    disabled={!overview.is_open}
                    saving={savingPlayerId === player.player_id}
                    onChange={(rating) => {
                      void handleRatingChange(
                        player.player_id,
                        rating,
                      );
                    }}
                  />
                ))}
              </section>
            )}
          </>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/iedereen-coach"
            className="ucl-button-secondary"
          >
            ← Terug naar wedstrijden
          </Link>

          <Link
            href={`/iedereen-coach/${matchId}/collectief`}
            className="ucl-button-secondary"
          >
            Collectieve basiself
          </Link>
        </div>
      </div>
    </main>
  );
}
