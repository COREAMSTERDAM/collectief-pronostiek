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
      className={`rounded-2xl border p-4 transition ${
        player.active
          ? "border-white/10 bg-white/5"
          : "border-white/5 bg-black/20 opacity-65"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className="h-16 w-16 shrink-0 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-2xl font-black text-white">
              {player.shirt_number ?? "⚽"}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-black text-white">
                {player.name}
              </h3>

              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                  player.active
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {player.active ? "Actief" : "Inactief"}
              </span>
            </div>

            <p className="ucl-muted mt-1">
              {player.shirt_number !== null
                ? `Nr. ${player.shirt_number}`
                : "Geen rugnummer"}
              {" · "}
              {player.position ?? "Geen positie"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onEdit(player)}
            disabled={actionsDisabled}
            className="ucl-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Bewerken
          </button>

          <button
            type="button"
            onClick={() => onToggleStatus(player)}
            disabled={actionsDisabled}
            className="ucl-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 font-black text-rose-200 transition hover:border-rose-300/50 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Verwijderen..." : "Verwijderen"}
          </button>
        </div>
      </div>
    </article>
  );
}