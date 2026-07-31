"use client";

export type VotePlayer = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
};

type PlayerVoteCardProps = {
  player: VotePlayer;
  rank: 1 | 2 | 3 | null;
  disabled?: boolean;
  onSelect: (player: VotePlayer) => void;
};

const rankDetails = {
  1: {
    medal: "🥇",
    label: "Eerste plaats",
    points: "10 punten",
    classes:
      "border-amber-300/70 bg-amber-400/10 shadow-lg shadow-amber-950/30",
  },
  2: {
    medal: "🥈",
    label: "Tweede plaats",
    points: "5 punten",
    classes:
      "border-slate-200/60 bg-slate-200/10 shadow-lg shadow-slate-950/30",
  },
  3: {
    medal: "🥉",
    label: "Derde plaats",
    points: "3 punten",
    classes:
      "border-orange-400/60 bg-orange-500/10 shadow-lg shadow-orange-950/30",
  },
} as const;

export default function PlayerVoteCard({
  player,
  rank,
  disabled = false,
  onSelect,
}: PlayerVoteCardProps) {
  const selectedDetails = rank ? rankDetails[rank] : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      disabled={disabled}
      className={`relative w-full overflow-hidden rounded-3xl border p-6 text-left transition-all duration-200 ${
        selectedDetails
          ? selectedDetails.classes
          : "border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-sky-300/40 hover:bg-white/[0.07]"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {selectedDetails && (
        <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5">
          <span className="text-xl">{selectedDetails.medal}</span>

          <span className="text-xs font-black uppercase tracking-wide text-white">
            #{rank}
          </span>
        </div>
      )}

      <div className="pr-20 text-center">
  <h3 className="cp-player-name w-full break-words text-white">
    {player.name}
  </h3>

  <div className="mt-5 flex justify-center">
    {player.photo_url ? (
      <img
        src={player.photo_url}
        alt={player.name}
        className="h-28 w-28 rounded-full border-2 border-sky-400/70 object-cover"
      />
    ) : (
      <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-sky-400/70 bg-sky-400/10 text-3xl">
        ⚽
      </div>
    )}
  </div>

  <p className="mt-4 text-base font-semibold text-white/60">
    {player.shirt_number !== null
      ? `Nr. ${player.shirt_number}`
      : "Geen rugnummer"}
    {" • "}
    {player.position ?? "Geen positie"}
  </p>
</div>

      <div className="mt-6 border-t border-white/10 pt-4">
        {selectedDetails ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-black text-white">
                {selectedDetails.medal} {selectedDetails.label}
              </p>

              <p className="mt-1 text-sm font-bold text-white/55">
                {selectedDetails.points}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-300">
              Geselecteerd
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <span className="font-semibold text-sky-200">
              Klik om te selecteren
            </span>

            <span className="shrink-0 rounded-full border border-sky-400/30 bg-sky-400/5 px-4 py-2 text-sm font-bold text-sky-300">
              Selecteer
            </span>
          </div>
        )}
      </div>
    </button>
  );
}