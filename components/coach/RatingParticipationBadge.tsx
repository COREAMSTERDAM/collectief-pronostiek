"use client";

import { useEffect, useState } from "react";
import {
  getMatchRatingProgress,
  type MatchRatingProgress,
} from "@/src/lib/coach-rating-progress";

type RatingParticipationBadgeProps = {
  matchId: number;
};

export default function RatingParticipationBadge({
  matchId,
}: RatingParticipationBadgeProps) {
  const [progress, setProgress] =
    useState<MatchRatingProgress | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadProgress() {
      try {
        const result = await getMatchRatingProgress(matchId);

        if (mounted) {
          setProgress(result);
        }
      } catch {
        // De beoordelingspagina zelf blijft bruikbaar als deze teller faalt.
      }
    }

    void loadProgress();

    return () => {
      mounted = false;
    };
  }, [matchId]);

  if (!progress) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
      <p className="text-sm font-bold text-white/60">
        🗳️{" "}
        <span className="text-white">
          {progress.supporters_completed}
        </span>{" "}
        {progress.supporters_completed === 1
          ? "supporter heeft"
          : "supporters hebben"}{" "}
        alle beoordelingen opgeslagen.
      </p>

      {progress.current_user_completed ? (
        <p className="mt-1 text-xs font-bold text-emerald-300">
          Jouw beoordelingen zijn volledig opgeslagen.
        </p>
      ) : null}
    </div>
  );
}
