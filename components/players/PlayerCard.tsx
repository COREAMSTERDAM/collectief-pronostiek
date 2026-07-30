"use client";

export type PlayerCardPlayer = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  active: boolean;
};

type PlayerCardProps = {
  player: PlayerCardPlayer;
  changingStatus?: boolean;
  deleting?: boolean;
  onEdit: (player: PlayerCardPlayer) => void;
  onToggleStatus: (player: PlayerCardPlayer) => void;
  onDelete: (player: PlayerCardPlayer) => void;
};

export default function PlayerCard({
  player,
  changingStatus = false,
  deleting = false,
  onEdit,
  onToggleStatus,
  onDelete,
}: PlayerCardProps) {
  const actionsDisabled = changingStatus || deleting;

  return (
    <article
      className={`overflow-hidden rounded-3xl border p-5 transition sm:p-6 ${
        player.active
          ? "border-sky-300/15 bg-white/[0.045] hover:border-sky-300/30 hover:bg-white/[0.065]"
          : "border-white/5 bg-black/20 opacity-70"
      }`}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="shrink-0">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className="h-24 w-24 rounded-full border-2 border-sky-400/70 object-cover shadow-lg shadow-sky-950/40 sm:h-28 sm:w-28"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-sky-400/70 bg-sky-400/10 text-3xl font-black text-white shadow-lg shadow-sky-950/40 sm:h-28 sm:w-28">
              {player.shirt_number ?? "⚽"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-2xl font-black text-white">
            {player.name}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm sm:text-base">
            <span className="font-bold text-white/70">
              👕{" "}
              {player.shirt_number !== null
                ? `Nr. ${player.shirt_number}`
                : "Geen rugnummer"}
            </span>

            <span className="hidden h-6 w-px bg-white/10 sm:block" />

            <span className="font-bold text-white/70">
              ⚽ {player.position ?? "Geen positie"}
            </span>

            <span className="hidden h-6 w-px bg-white/10 sm:block" />

            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide ${
                player.active
                  ? "bg-emerald-500/15 text-emerald-200"
                  : "bg-white/10 text-white/55"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  player.active ? "bg-emerald-300" : "bg-white/40"
                }`}
              />
              {player.active ? "Actief" : "Inactief"}
            </span>
          </div>

          <div className="my-5 h-px bg-white/10" />

          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => onEdit(player)}
              disabled={actionsDisabled}
              className="ucl-button-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              Bewerken
            </button>

            <button
              type="button"
              onClick={() => onToggleStatus(player)}
              disabled={actionsDisabled}
              className="ucl-button-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingStatus
                ? "Bezig..."
                : player.active
                  ? "Inactief zetten"
                  : "Actief zetten"}
            </button>

            <button
              type="button"
              onClick={() => onDelete(player)}
              disabled={actionsDisabled}
              className="w-full rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 font-black text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "Verwijderen..." : "Verwijderen"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
