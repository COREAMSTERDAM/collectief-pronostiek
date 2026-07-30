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
  const disabled = changingStatus || deleting;

  return (
    <article
      className={`rounded-3xl border p-5 transition sm:p-6 ${
        player.active
          ? "border-sky-300/15 bg-white/[0.045]"
          : "border-white/5 bg-black/20 opacity-70"
      }`}
    >
      {/* Spelersinformatie: volledig boven de knoppen */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={player.name}
            className="h-24 w-24 shrink-0 rounded-full border-2 border-sky-400/80 object-cover shadow-lg shadow-sky-950/40 sm:h-28 sm:w-28"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-sky-400/80 bg-sky-400/10 text-3xl sm:h-28 sm:w-28">
            ⚽
          </div>
        )}

        <div className="min-w-0 text-center sm:text-left">
          <h3 className="truncate text-2xl font-black text-white sm:text-3xl">
            {player.name}
          </h3>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-white/70 sm:justify-start sm:text-base">
            <span>
              👕{" "}
              {player.shirt_number !== null
                ? `Nr. ${player.shirt_number}`
                : "Geen rugnummer"}
            </span>

            <span className="text-white/20">•</span>

            <span>⚽ {player.position ?? "Geen positie"}</span>

            <span className="text-white/20">•</span>

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
        </div>
      </div>

      {/* Scheidingslijn over de volledige kaart */}
      <div className="my-5 h-px w-full bg-white/10" />

      {/* Knoppen altijd onder alle spelersinformatie */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <button
          type="button"
          onClick={() => onEdit(player)}
          disabled={disabled}
          className="ucl-button-secondary w-full justify-center disabled:cursor-not-allowed disabled:opacity-50"
        >
          Bewerken
        </button>

        <button
          type="button"
          onClick={() => onToggleStatus(player)}
          disabled={disabled}
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
          disabled={disabled}
          className="w-full rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 font-black text-rose-200 transition hover:border-rose-300/60 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "Verwijderen..." : "Verwijderen"}
        </button>
      </div>
    </article>
  );
}