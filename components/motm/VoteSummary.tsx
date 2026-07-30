"use client";

import type { VotePlayer } from "./PlayerVoteCard";

type VoteSummaryProps = {
  players: VotePlayer[];
  selectedPlayerIds: number[];
  submitting?: boolean;
  disabled?: boolean;
  onSubmit: () => void;
};

const rankDetails = [
  {
    medal: "🥇",
    label: "Eerste plaats",
    points: "10 punten",
  },
  {
    medal: "🥈",
    label: "Tweede plaats",
    points: "5 punten",
  },
  {
    medal: "🥉",
    label: "Derde plaats",
    points: "3 punten",
  },
] as const;

export default function VoteSummary({
  players,
  selectedPlayerIds,
  submitting = false,
  disabled = false,
  onSubmit,
}: VoteSummaryProps) {
  const selectedPlayers = selectedPlayerIds.map((playerId) =>
    players.find((player) => player.id === playerId),
  );

  const selectionComplete =
    selectedPlayerIds.length === 3 &&
    selectedPlayers.every((player) => player !== undefined);

  return (
    <section className="ucl-card-dark sticky top-6 p-6">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">
        Jouw selectie
      </p>

      <h2 className="mt-2 text-2xl font-black text-white">
        Top 3 spelers
      </h2>

      <div className="mt-6 space-y-3">
        {rankDetails.map((rank, index) => {
          const player = selectedPlayers[index];

          return (
            <div
              key={rank.label}
              className="flex min-h-20 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >
              <span className="text-2xl">{rank.medal}</span>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-white/45">
                  {rank.label}
                </p>

                {player ? (
                  <p className="mt-1 truncate font-black text-white">
                    {player.name}
                  </p>
                ) : (
                  <p className="mt-1 font-bold text-white/35">
                    Nog niet gekozen
                  </p>
                )}
              </div>

              <span className="text-xs font-black text-white/45">
                {rank.points}
              </span>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={
          disabled ||
          submitting ||
          !selectionComplete
        }
        className="ucl-button-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Stem wordt opgeslagen..." : "Stem opslaan"}
      </button>

      {!selectionComplete && (
        <p className="mt-3 text-center text-sm font-bold text-white/45">
          Kies eerst drie verschillende spelers.
        </p>
      )}
    </section>
  );
}