import type { MotmStanding } from "@/src/lib/motm";

type LiveStandingsProps = {
  standings: MotmStanding[];
  selectedPlayerIds?: number[];
  isFinal?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
};

function getPlaceLabel(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

function getTopThreeClasses(index: number) {
  if (index === 0) {
    return "border-amber-300/25 bg-gradient-to-r from-amber-300/15 via-yellow-400/5 to-transparent";
  }

  if (index === 1) {
    return "border-slate-200/20 bg-gradient-to-r from-slate-200/10 via-white/5 to-transparent";
  }

  if (index === 2) {
    return "border-orange-400/20 bg-gradient-to-r from-orange-400/10 via-orange-300/5 to-transparent";
  }

  return "border-white/5 bg-white/[0.02]";
}

export default function LiveStandings({
  standings,
  selectedPlayerIds = [],
  isFinal = false,
  isRefreshing = false,
  onRefresh,
}: LiveStandingsProps) {
  const maxPoints = Math.max(
    ...standings.map((standing) => standing.points),
    1,
  );

  const selectedRankByPlayer = new Map(
    selectedPlayerIds.map((playerId, index) => [playerId, index + 1]),
  );

  return (
    <section className="ucl-card-dark overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-white/10 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">
            {isFinal ? "Definitieve uitslag" : "Live tussenstand"}
          </p>

          <h2 className="mt-2 text-2xl font-black text-white">
            Man van de Wedstrijd
          </h2>
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex h-11 w-auto items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {isRefreshing ? "Vernieuwen..." : "Refreshen"}
          </button>
        )}
      </div>

      {standings.length === 0 ? (
        <div className="px-5 py-8 text-center md:px-7">
          <p className="font-bold text-white/55">
            Er zijn nog geen stemmen uitgebracht.
          </p>
        </div>
      ) : (
        <div className="space-y-3 p-4 md:p-5">
          {standings.map((standing, index) => {
            const barWidth = Math.max(
              (standing.points / maxPoints) * 100,
              6,
            );

            const selectedRank = selectedRankByPlayer.get(standing.id);

            return (
              <article
                key={standing.id}
                className={`rounded-2xl border px-4 py-4 transition-all duration-300 md:px-5 ${getTopThreeClasses(
                  index,
                )}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-white shadow-inner shadow-white/5">
                    {getPlaceLabel(index)}
                  </div>

                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                    {standing.photo_url ? (
                      <img
                        src={standing.photo_url}
                        alt={standing.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-black text-white/35">
                        {standing.shirt_number ?? "—"}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-black text-white md:text-lg">
                            {standing.name}
                          </p>

                          {selectedRank && (
                            <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-200">
                              Jouw nummer {selectedRank}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs font-bold text-white/45">
                          {standing.firstPlaceVotes}× 1e ·{" "}
                          {standing.secondPlaceVotes}× 2e ·{" "}
                          {standing.thirdPlaceVotes}× 3e
                        </p>
                      </div>

                      <p className="shrink-0 text-lg font-black text-sky-300">
                        {standing.points} pt
                      </p>
                    </div>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 transition-[width] duration-700 ease-out"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
