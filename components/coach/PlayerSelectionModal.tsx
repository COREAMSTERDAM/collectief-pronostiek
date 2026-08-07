"use client";

import { useEffect } from "react";
import type { CoachPlayer } from "@/src/lib/coach";

export type PlayerSelectionTarget = {
  code: string;
  label: string;
  kind: "starter" | "substitute";
};

type PlayerSelectionModalProps = {
  isOpen: boolean;
  target: PlayerSelectionTarget | null;
  players: CoachPlayer[];
  selectedPlayerIds: number[];
  currentPlayerId: number | null;
  onSelect: (player: CoachPlayer) => void;
  onRemove: () => void;
  onClose: () => void;
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

export default function PlayerSelectionModal({
  isOpen,
  target,
  players,
  selectedPlayerIds,
  currentPlayerId,
  onSelect,
  onRemove,
  onClose,
}: PlayerSelectionModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !target) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 bottom-[5.5rem] z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:inset-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="max-h-[72vh] w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-white/15 bg-zinc-950 shadow-2xl shadow-black/60 sm:max-h-[82vh] sm:max-w-2xl sm:rounded-[2rem]">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 p-4 sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200/70">
              {target.code}
            </p>

            <h2
              id="player-modal-title"
              className="mt-1 text-xl font-black text-white sm:text-2xl"
            >
              Kies een speler
            </h2>

            <p className="mt-1 text-sm text-white/50">
              {target.label}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-black text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Venster sluiten"
          >
            ×
          </button>
        </header>

        <div className="max-h-[54vh] overflow-y-auto p-3 sm:max-h-[65vh] sm:p-6">
          {currentPlayerId !== null ? (
            <button
              type="button"
              onClick={onRemove}
              className="mb-4 w-full rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/15"
            >
              Speler uit deze selectieplaats verwijderen
            </button>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            {players.map((player) => {
              const isCurrent = player.id === currentPlayerId;
              const isUsedElsewhere =
                selectedPlayerIds.includes(player.id) && !isCurrent;

              return (
                <button
                  key={player.id}
                  type="button"
                  disabled={isUsedElsewhere}
                  onClick={() => onSelect(player)}
                  className={[
                    "flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition sm:gap-3 sm:rounded-2xl sm:p-3",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300",
                    isCurrent
                      ? "border-emerald-300/50 bg-emerald-300/12"
                      : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.07]",
                    isUsedElsewhere
                      ? "cursor-not-allowed opacity-35"
                      : "hover:-translate-y-0.5",
                  ].join(" ")}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-black text-[11px] font-black text-white sm:h-12 sm:w-12 sm:text-xs">
                    {player.photo_url ? (
                      <img
                        src={player.photo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(player.name)
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-black text-white">
                      {player.name}
                    </span>

                    <span className="mt-1 block text-xs font-semibold text-white/45">
                      {player.shirt_number !== null
                        ? `Nr. ${player.shirt_number}`
                        : "Geen rugnummer"}
                      {" · "}
                      {player.position ?? "Geen positie"}
                    </span>

                    {isUsedElsewhere ? (
                      <span className="mt-1 block text-[11px] font-bold text-emerald-200/70">
                        Al geselecteerd
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}