import type { PlayerTrend } from "@/src/lib/coach-analytics";

type AnalyticsTrendListProps = {
  title: string;
  subtitle: string;
  players: PlayerTrend[];
  direction: "up" | "down";
};

export default function AnalyticsTrendList({
  title,
  subtitle,
  players,
  direction,
}: AnalyticsTrendListProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-1 text-sm text-white/45">{subtitle}</p>

      {players.length === 0 ? (
        <p className="mt-5 text-sm text-white/40">
          Nog onvoldoende data voor deze trend.
        </p>
      ) : (
        <div className="mt-5 divide-y divide-white/10">
          {players.map((player, index) => (
            <article
              key={player.player_id}
              className="flex items-center gap-3 py-3"
            >
              <span className="w-6 text-center text-sm font-black text-white/35">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-black text-white">
                  {player.player_name}
                </p>
                <p className="mt-1 text-xs font-semibold text-white/40">
                  {player.previous_percentage}% → {player.current_percentage}%
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${
                  direction === "up"
                    ? "bg-emerald-400/15 text-emerald-300"
                    : "bg-red-400/15 text-red-300"
                }`}
              >
                {direction === "up" ? "+" : ""}
                {player.percentage_change}%
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
