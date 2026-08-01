"use client";

import type { MatchRatingPlayer } from "@/src/lib/coach-ratings";

type Props = {
  player: MatchRatingPlayer;
  value: string;
  disabled: boolean;
  errorMessage?: string;
  onChange: (value: string) => void;
};

export default function PlayerRatingCard({
  player,
  value,
  disabled,
  errorMessage = "",
  onChange,
}: Props) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-lg font-black text-white">
        {player.player_name}
      </h2>

      <p className="mt-1 text-xs font-semibold text-white/40">
        {player.shirt_number !== null
          ? `Nr. ${player.shirt_number}`
          : "Geen rugnummer"}
        {" · "}
        {player.position ?? "Geen positie"}
      </p>

      {player.final_average !== null ? (
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-xs font-black uppercase text-white/35">
              Jouw cijfer
            </p>
            <p className="mt-1 text-2xl font-black text-amber-200">
              {player.my_rating === null
                ? "—"
                : player.my_rating.toFixed(1).replace(".", ",")}
            </p>
          </div>

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
          <label
            htmlFor={`rating-${player.player_id}`}
            className="block text-sm font-black text-white"
          >
            Jouw beoordeling
          </label>

          <input
            id={`rating-${player.player_id}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Bijvoorbeeld 7,5"
            className={`ucl-input mt-3 text-center text-2xl font-black ${
              errorMessage ? "!border-red-400/50" : ""
            }`}
          />

          <p className="mt-2 text-center text-xs font-semibold text-white/35">
            Gebruik één cijfer na de komma, bijvoorbeeld 7,5.
          </p>

          {errorMessage ? (
            <p className="mt-2 text-center text-xs font-bold text-red-300">
              {errorMessage}
            </p>
          ) : null}
        </div>
      )}
    </article>
  );
}
