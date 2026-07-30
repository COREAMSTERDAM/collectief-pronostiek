import type { MotmStanding } from "@/src/lib/motm";

type LiveStandingsProps = {
  standings: MotmStanding[];
  isFinal?: boolean;
};

function getPlaceLabel(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

export default function LiveStandings({
  standings,
  isFinal = false,
}: LiveStandingsProps) {
  const maxPoints = Math.max(
    ...standings.map((standing) => standing.points),
    1,
  );

  return (
    <section className="ucl-card-dark overflow-hidden">
      <div className="border-b border-white/10 px-5 py-5 md:px-7">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">
          {isFinal ? "Definitieve uitslag" : "Live tussenstand"}
        </p>

        <h2 className="mt-2 text-2xl font-black text-white">
          Man van de Wedstrijd
        </h2>

        <p className="mt-2 text-sm font-semibold text-white/50">
          1e plaats = 10 punten · 2e plaats = 5 punten · 3e plaats = 3 punten
        </p>
      </div>

      {standings.length === 0 ? (
        <div className="px-5 py-8 text-center md:px-7">
          <p className="font-bold text-white/55">
            Er zijn nog geen stemmen uitgebracht.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {standings.map((standing, index) => {
            const barWidth = Math.max(
              (standing.points / maxPoints) * 100,
              6,
            );

            return (
              <article
                key={standing.id}
                className="flex items-center gap-4 px-5 py-5 md:px-7"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-white">
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-white md:text-lg">
                        {standing.name}
                      </p>

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

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
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
