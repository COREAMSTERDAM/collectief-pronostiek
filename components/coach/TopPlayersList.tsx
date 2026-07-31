import type { CollectiveTopPlayer } from "@/src/lib/coach";

type TopPlayersListProps = {
  players: CollectiveTopPlayer[];
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

export default function TopPlayersList({
  players,
}: TopPlayersListProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
          Selectiepopulariteit
        </p>
        <h2 className="mt-1 text-xl font-black text-white">
          Meest gekozen spelers
        </h2>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-white/45">
          Nog geen spelerdata beschikbaar.
        </p>
      ) : (
        <div className="divide-y divide-white/10">
          {players.map((player, index) => (
            <article
              key={player.player_id}
              className="flex items-center gap-3 py-3"
            >
              <span className="w-7 shrink-0 text-center text-sm font-black text-white/40">
                {index + 1}
              </span>

              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-xs font-black text-white">
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
                <p className="break-words text-sm font-black text-white">
                  {player.player_name}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-white/40">
                  {player.registered_position ?? "Geen positie"}
                  {" · "}
                  {player.coach_count}{" "}
                  {player.coach_count === 1 ? "coach" : "coaches"}
                </p>
              </div>

              <span className="shrink-0 text-base font-black text-amber-200">
                {player.selection_percentage}%
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
