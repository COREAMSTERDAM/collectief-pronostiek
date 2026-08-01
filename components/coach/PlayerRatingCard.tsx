"use client";

import { useMemo } from "react";
import type { MatchRatingPlayer } from "@/src/lib/coach-ratings";

type PlayerRatingCardProps = {
  player: MatchRatingPlayer;
  disabled: boolean;
  saving: boolean;
  onChange: (rating: number) => void;
};

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

export default function PlayerRatingCard({
  player,
  disabled,
  saving,
  onChange,
}: PlayerRatingCardProps) {
  const value = player.my_rating ?? 5;

  const formattedValue = useMemo(
    () => value.toFixed(1).replace(".", ","),
    [value],
  );

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-sm font-black">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials(player.player_name)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-black text-white">
            {player.player_name}
          </h2>

          <p className="mt-1 text-xs font-semibold text-white/40">
            {player.shirt_number !== null
              ? `Nr. ${player.shirt_number}`
              : "Geen rugnummer"}
            {" · "}
            {player.position ?? "Geen positie"}
            {player.started_match ? " · Basis" : ""}
            {player.minutes_played !== null
              ? ` · ${player.minutes_played} min`
              : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-black text-amber-200">
            {formattedValue}
          </p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/35">
            jouw cijfer
          </p>
        </div>
      </div>

      {player.final_average !== null ? (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-xs font-black uppercase text-white/35">
              Gemiddelde
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {player.final_average.toFixed(2).replace(".", ",")}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-xs font-black uppercase text-white/35">
              Stemmen
            </p>
            <p className="mt-1 text-2xl font-black text-white">
              {player.rating_count ?? 0}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <input
            type="range"
            min="1"
            max="10"
            step="0.1"
            value={value}
            disabled={disabled || saving}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full accent-amber-300"
            aria-label={`Cijfer voor ${player.player_name}`}
          />

          <div className="mt-2 flex justify-between text-[11px] font-bold text-white/35">
            <span>1,0</span>
            <span>5,0</span>
            <span>10,0</span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={disabled || saving}
              onClick={() => onChange(Math.max(1, value - 0.1))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black disabled:opacity-35"
            >
              − 0,10
            </button>

            <span className="text-xs font-bold text-white/40">
              {saving ? "Opslaan…" : "Wordt automatisch opgeslagen"}
            </span>

            <button
              type="button"
              disabled={disabled || saving}
              onClick={() => onChange(Math.min(10, value + 0.1))}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black disabled:opacity-35"
            >
              + 0,10
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
