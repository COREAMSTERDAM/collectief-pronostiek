"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMatchRatingAdminProgress,
  type MatchRatingAdminProgress,
} from "@/src/lib/coach-rating-progress";

type RatingProgressPanelProps = {
  matchId: number;
  refreshKey?: number;
};

function formatAverage(value: number | null) {
  return value === null
    ? "—"
    : value.toFixed(1).replace(".", ",");
}

export default function RatingProgressPanel({
  matchId,
  refreshKey = 0,
}: RatingProgressPanelProps) {
  const [progress, setProgress] =
    useState<MatchRatingAdminProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getMatchRatingAdminProgress(matchId);
      setProgress(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De beoordelingsvoortgang kon niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress, refreshKey]);

  if (loading) {
    return (
      <section className="ucl-card mt-6">
        <p className="ucl-muted text-center">
          Beoordelingsvoortgang laden…
        </p>
      </section>
    );
  }

  if (errorMessage || !progress) {
    return (
      <section className="mt-6 rounded-3xl border border-red-400/25 bg-red-400/10 p-5 text-sm font-semibold text-red-100">
        {errorMessage || "Geen voortgang beschikbaar."}
      </section>
    );
  }

  const completionPercentage =
    progress.total_supporters === 0
      ? 0
      : Math.round(
          (progress.supporters_completed /
            progress.total_supporters) *
            100,
        );

  const missingCount = Math.max(
    progress.total_supporters - progress.supporters_completed,
    0,
  );

  return (
    <section className="ucl-card mt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
            Beoordelingsvoortgang
          </p>

          <h2 className="mt-1 text-2xl font-black text-white">
            {progress.supporters_completed} van{" "}
            {progress.total_supporters} beoordelingen ontvangen
          </h2>

          <p className="mt-2 text-sm font-semibold text-white/45">
            Alleen volledig opgeslagen beoordelingen tellen mee in deze teller.
          </p>
        </div>

        <p className="text-4xl font-black text-amber-200">
          {completionPercentage}%
        </p>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-white to-amber-300"
          style={{ width: `${completionPercentage}%` }}
        />
      </div>

      <div
        className={`mt-5 rounded-2xl border p-4 text-sm font-bold ${
          missingCount === 0 && progress.total_supporters !== 0
            ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
            : "border-amber-300/25 bg-amber-400/10 text-amber-100"
        }`}
      >
        {progress.total_supporters === 0 ? (
          <p>Er zijn nog geen gebruikers beschikbaar.</p>
        ) : missingCount === 0 ? (
          <p>
            ✅ Alle supporters hebben hun volledige beoordeling opgeslagen.
          </p>
        ) : (
          <p>
            ⚠ Er ontbreken nog {missingCount} volledige{" "}
            {missingCount === 1 ? "beoordeling" : "beoordelingen"}.
          </p>
        )}
      </div>

      <div className="mt-7 border-t border-white/10 pt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
              Live tussenstand
            </p>

            <h3 className="mt-1 text-xl font-black text-white">
              Voorlopige gemiddelden
            </h3>
          </div>

          <p className="text-xs font-semibold text-white/35">
            Alleen zichtbaar voor admins · nog niet definitief
          </p>
        </div>

        {progress.players.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-sm font-semibold text-white/45">
              Nog geen actieve spelers of beoordelingen beschikbaar.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {progress.players.map((player, index) => (
              <article
                key={player.player_id}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-white/60">
                  {index + 1}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-black text-white">
                    {player.player_name}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    {player.shirt_number !== null
                      ? `Nr. ${player.shirt_number}`
                      : "Geen rugnummer"}
                    {" · "}
                    {player.position ?? "Geen positie"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-black tabular-nums text-amber-200">
                    {formatAverage(player.provisional_average)}
                  </p>

                  <p className="text-[10px] font-black uppercase tracking-wide text-white/30">
                    voorlopig
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
