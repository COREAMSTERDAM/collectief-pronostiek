"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import PlayerRatingCard from "@/components/coach/PlayerRatingCard";
import RatingDeadline from "@/components/coach/RatingDeadline";
import {
  getMyMatchRatings,
  savePlayerMatchRatingsBulk,
  type MatchRatingsOverview,
} from "@/src/lib/coach-ratings";
import {
  getCoachMatch,
  type CoachMatch,
} from "@/src/lib/coach-match-editor";
import RatingParticipationBadge from "@/components/coach/RatingParticipationBadge";

type DraftRatings = Record<number, string>;
type RatingErrors = Record<number, string>;

function formatInputValue(value: number | null) {
  return value === null ? "" : value.toFixed(1).replace(".", ",");
}

function parseRating(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.replace(",", ".");

  if (!trimmed) return { value: null, error: "Vul een beoordeling in." };

  if (!/^\d{1,2}(?:[.,]\d)?$/.test(trimmed)) {
    return {
      value: null,
      error: "Gebruik één cijfer na de komma, bijvoorbeeld 7,5.",
    };
  }

  const rating = Number(normalized);

  if (!Number.isFinite(rating) || rating < 1 || rating > 10) {
    return {
      value: null,
      error: "Het cijfer moet tussen 1,0 en 10,0 liggen.",
    };
  }

  return { value: Math.round(rating * 10) / 10, error: "" };
}

export default function MatchRatingsPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<CoachMatch | null>(null);
  const [overview, setOverview] = useState<MatchRatingsOverview | null>(null);
  const [draftRatings, setDraftRatings] = useState<DraftRatings>({});
  const [ratingErrors, setRatingErrors] = useState<RatingErrors>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const completedCount = useMemo(() => {
    if (!overview) return 0;

    return overview.players.filter((player) => {
      const parsed = parseRating(draftRatings[player.player_id] ?? "");
      return parsed.value !== null && !parsed.error;
    }).length;
  }, [draftRatings, overview]);

  const totalPlayers = overview?.players.length ?? 0;
  const progress =
    totalPlayers === 0 ? 0 : (completedCount / totalPlayers) * 100;

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const [matchResult, ratingResult] = await Promise.all([
        getCoachMatch(matchId),
        getMyMatchRatings(matchId),
      ]);

      if (!matchResult) throw new Error("Deze wedstrijd werd niet gevonden.");

      setMatch(matchResult);
      setOverview(ratingResult);
      setDraftRatings(
        Object.fromEntries(
          ratingResult.players.map((player) => [
            player.player_id,
            formatInputValue(player.my_rating),
          ]),
        ),
      );
      setRatingErrors({});
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
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [loadPage]);

  function updateDraftRating(playerId: number, value: string) {
    setDraftRatings((current) => ({
      ...current,
      [playerId]: value.replace(/[^\d,.]/g, "").slice(0, 4),
    }));

    setRatingErrors((current) => {
      const next = { ...current };
      delete next[playerId];
      return next;
    });

    setSuccessMessage("");
  }

  async function handleSaveAll() {
    if (!overview?.is_open || saving) return;

    const nextErrors: RatingErrors = {};
    const ratings: Array<{ playerId: number; rating: number }> = [];

    for (const player of overview.players) {
      const parsed = parseRating(draftRatings[player.player_id] ?? "");

      if (parsed.error || parsed.value === null) {
        nextErrors[player.player_id] = parsed.error;
      } else {
        ratings.push({
          playerId: player.player_id,
          rating: parsed.value,
        });
      }
    }

    setRatingErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setErrorMessage("Controleer de rood gemarkeerde beoordelingen.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const savedCount = await savePlayerMatchRatingsBulk({
        matchId,
        ratings,
      });

      setSuccessMessage(
        `✅ ${savedCount} beoordelingen werden succesvol opgeslagen.`,
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De beoordelingen konden niet worden opgeslagen.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container !max-w-4xl">
          <section className="ucl-card text-center">
            <p className="ucl-subtitle">Spelersbeoordelingen laden…</p>
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
              <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
                Iedereen Coach
              </p>
              <h1 className="ucl-title mt-3">Spelers beoordelen</h1>
              <p className="mt-4 text-xl font-black">
                {match.home_team}
                <span className="mx-3 text-emerald-200/60">VS</span>
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
            <div className="mt-4">
  <RatingParticipationBadge matchId={matchId} />
</div>

            <section className="ucl-card mt-6">
              <h2 className="text-xl font-black">
                {completedCount} van {totalPlayers} spelers ingevuld
              </h2>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white to-emerald-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            <section className="mt-6 space-y-4">
              {overview.players.map((player) => (
                <PlayerRatingCard
                  key={player.player_id}
                  player={player}
                  value={draftRatings[player.player_id] ?? ""}
                  disabled={!overview.is_open || saving}
                  errorMessage={ratingErrors[player.player_id]}
                  onChange={(value) =>
                    updateDraftRating(player.player_id, value)
                  }
                />
              ))}
            </section>

            {overview.is_open && overview.players.length > 0 ? (
              <section className="ucl-card mt-6">
                <p className="text-center text-sm font-semibold text-white/45">
                  Controleer je cijfers vóór je ze opslaat.
                </p>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSaveAll()}
                  className="ucl-button-primary disabled:opacity-40"
                >
                  {saving
                    ? "Beoordelingen opslaan…"
                    : "💾 Alle beoordelingen opslaan"}
                </button>
              </section>
            ) : null}
          </>
        ) : null}

        <div className="mt-8">
          <Link href="/iedereen-coach" className="ucl-button-secondary">
            ← Terug naar wedstrijden
          </Link>
        </div>
      </div>
    </main>
  );
}
