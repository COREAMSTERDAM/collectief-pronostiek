"use client";

import type { CoachPlayer } from "@/src/lib/coach";

type SubstituteBenchProps = {
  selectedPlayers: Record<number, CoachPlayer>;
  disabled?: boolean;
  onSlotClick: (benchOrder: number) => void;
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

export default function SubstituteBench({
  selectedPlayers,
  disabled = false,
  onSlotClick,
}: SubstituteBenchProps) {
  const selectedCount = Object.keys(selectedPlayers).length;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 sm:p-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
          Bank
        </p>

        <h2 className="mt-1 text-xl font-black text-white">
          Jouw vijf bankzitters
        </h2>

        <p className="mt-1 text-xs font-semibold text-white/45">
          {selectedCount} van 5 bankplaatsen ingevuld
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[1, 2, 3, 4, 5].map((benchOrder) => {
          const player = selectedPlayers[benchOrder] ?? null;

          return (
            <button
              key={benchOrder}
              type="button"
              disabled={disabled}
              onClick={() => onSlotClick(benchOrder)}
              className={[
                "min-h-36 rounded-2xl border p-3 text-center transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
                player
                  ? "border-amber-300/30 bg-amber-300/[0.08]"
                  : "border-dashed border-white/15 bg-black/20",
                disabled
                  ? "cursor-default"
                  : "hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]",
              ].join(" ")}
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-xs font-black text-white">
                {player?.photo_url ? (
                  <img
                    src={player.photo_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : player ? (
                  initials(player.name)
                ) : (
                  `B${benchOrder}`
                )}
              </span>

              <span className="mt-3 block text-xs font-black uppercase tracking-wide text-white/35">
                Bank {benchOrder}
              </span>

              <span className="mt-1 block break-words text-sm font-black text-white">
                {player?.name ?? "Kies speler"}
              </span>

              {player ? (
                <span className="mt-1 block text-[11px] font-semibold text-white/40">
                  {player.shirt_number !== null
                    ? `Nr. ${player.shirt_number}`
                    : "Geen rugnummer"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-white/45">
        De definitieve gemiddelden van de bankzitters tellen later mee voor
        je coachscore.
      </p>
    </section>
  );
}
