import type { PlayerHeatmap } from "@/src/lib/coach-analytics";

type PlayerHeatmapListProps = {
  players: PlayerHeatmap[];
};

export default function PlayerHeatmapList({
  players,
}: PlayerHeatmapListProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
          Positiegebruik
        </p>
        <h2 className="mt-1 text-xl font-black text-white">
          Positie-heatmaps
        </h2>
      </div>

      {players.length === 0 ? (
        <p className="mt-5 text-sm text-white/40">
          Nog geen heatmapdata beschikbaar.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {players.slice(0, 15).map((player) => (
            <article
              key={player.player_id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-white">
                    {player.player_name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white/40">
                    Gekozen door {player.selection_percentage}% van de coaches
                  </p>
                </div>

                <span className="text-sm font-black text-amber-200">
                  {player.positions.length} posities
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {player.positions.map((position) => (
                  <div key={position.position_code}>
                    <div className="mb-1 flex items-center justify-between text-xs font-bold">
                      <span className="text-white/65">
                        {position.position_code} · {position.position_label}
                      </span>
                      <span className="text-white">
                        {position.percentage_of_player_selections}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-white to-amber-300"
                        style={{
                          width: `${Math.min(
                            100,
                            position.percentage_of_player_selections,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
