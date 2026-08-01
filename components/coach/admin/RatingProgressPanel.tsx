"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getMatchRatingAdminProgress,
  type MatchRatingAdminProgress,
  type RatingUserStatus,
} from "@/src/lib/coach-rating-progress";

type RatingProgressPanelProps = {
  matchId: number;
  refreshKey?: number;
};

function statusLabel(status: RatingUserStatus["status"]) {
  if (status === "completed") return "Volledig";
  if (status === "partial") return "Gedeeltelijk";
  return "Niet gestart";
}

function statusClass(status: RatingUserStatus["status"]) {
  if (status === "completed") {
    return "border-emerald-300/25 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "partial") {
    return "border-amber-300/25 bg-amber-400/10 text-amber-200";
  }

  return "border-white/10 bg-white/5 text-white/40";
}

export default function RatingProgressPanel({
  matchId,
  refreshKey = 0,
}: RatingProgressPanelProps) {
  const [progress, setProgress] =
    useState<MatchRatingAdminProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [userFilter, setUserFilter] = useState<
    "all" | "completed" | "partial" | "not_started"
  >("all");

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

  const filteredUsers = useMemo(() => {
    if (!progress) return [];

    if (userFilter === "all") return progress.users;

    return progress.users.filter(
      (user) => user.status === userFilter,
    );
  }, [progress, userFilter]);

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

  return (
    <section className="ucl-card mt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
            Beoordelingen
          </p>

          <h2 className="mt-1 text-2xl font-black text-white">
            {progress.supporters_completed} van{" "}
            {progress.total_supporters} volledig opgeslagen
          </h2>

          <p className="mt-2 text-sm font-semibold text-white/45">
            {progress.total_saved_ratings} individuele cijfers ontvangen
            voor {progress.active_player_count} actieve spelers.
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

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Volledig" value={progress.supporters_completed} />
        <Stat label="Gedeeltelijk" value={progress.supporters_partial} />
        <Stat label="Niet gestart" value={progress.supporters_not_started} />
        <Stat label="Gestart" value={progress.supporters_started} />
      </div>

      <div className="mt-7 border-t border-white/10 pt-6">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Iedereen"],
              ["completed", "Volledig"],
              ["partial", "Gedeeltelijk"],
              ["not_started", "Niet gestart"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setUserFilter(value)}
              className={`rounded-full border px-4 py-2 text-xs font-black ${
                userFilter === value
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-white/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {filteredUsers.map((user) => (
            <article
              key={user.user_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-white">
                  {user.name}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  {user.rated_player_count} van{" "}
                  {progress.active_player_count} spelers
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${statusClass(
                  user.status,
                )}`}
              >
                {statusLabel(user.status)}
              </span>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-7 border-t border-white/10 pt-6">
        <h3 className="text-xl font-black text-white">
          Beoordelingen per speler
        </h3>

        <div className="mt-4 space-y-2">
          {progress.players.map((player) => (
            <article
              key={player.player_id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
            >
              <div>
                <p className="font-black text-white">
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

              <p className="shrink-0 text-xl font-black text-amber-200">
                {player.rating_count}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
      <p className="text-xs font-black uppercase text-white/35">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black text-white">
        {value}
      </p>
    </div>
  );
}
