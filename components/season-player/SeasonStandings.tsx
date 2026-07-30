import type { SeasonStanding } from "@/src/lib/season-player";

type SeasonStandingsProps = {
  standings: SeasonStanding[];
};

function getPlaceLabel(index: number) {
  if (index === 0) return "🥇";
  if (index === 1) return "🥈";
  if (index === 2) return "🥉";
  return `${index + 1}`;
}

function getCardClasses(index: number) {
  if (index === 0) {
    return "border-amber-300/30 bg-gradient-to-r from-amber-300/15 via-yellow-400/5 to-transparent";
  }

  if (index === 1) {
    return "border-slate-200/20 bg-gradient-to-r from-slate-200/10 via-white/5 to-transparent";
  }

  if (index === 2) {
    return "border-orange-400/25 bg-gradient-to-r from-orange-400/10 via-orange-300/5 to-transparent";
  }

  return "border-white/10 bg-white/[0.025]";
}

export default function SeasonStandings({
  standings,
}: SeasonStandingsProps) {
  const maxPoints = Math.max(
    ...standings.map((standing) => standing.points),
    1,
  );

  if (standings.length === 0) {
    return (
      <section className="ucl-card-dark p-7 text-center">
        <p className="text-lg font-black text-white">
          Nog geen seizoensklassement
        </p>

        <p className="mt-2 font-semibold text-white/50">
          Zodra er stemmen zijn uitgebracht, verschijnt hier de
          rangschikking.
        </p>
      </section>
    );
  }

  return (
    <section className="ucl-card-dark overflow-hidden">
      <div className="border-b border-white/10 px-5 py-6 md:px-7">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">
          Algemeen klassement - Top 10
        </p>

        <h2 className="mt-2 text-2xl font-black text-white md:text-3xl">
          Speler van het Seizoen
        </h2>

        <p className="mt-2 text-sm font-semibold text-white/50">
          Alle punten uit de Man van de Wedstrijd-stemmingen
          worden automatisch opgeteld.
        </p>
      </div>

      <div className="space-y-3 p-4 md:p-5">
        {standings.map((standing, index) => {
          const barWidth = Math.max(
            (standing.points / maxPoints) * 100,
            5,
          );

          return (
            <article
              key={standing.id}
              className={`rounded-2xl border p-4 transition-all duration-300 md:p-5 ${getCardClasses(
                index,
              )}`}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black text-white">
                  {getPlaceLabel(index)}
                </div>

                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {standing.photo_url ? (
                    <img
                      src={standing.photo_url}
                      alt={standing.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-black text-white/35">
                      {standing.shirt_number ?? "—"}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black text-white">
                        {standing.name}
                      </p>

                      <p className="mt-1 text-xs font-bold text-white/45">
                        {standing.position || "Speler"}
                        {!standing.active && " · Niet actief"}
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="text-xl font-black text-sky-300">
                        {standing.points} pt
                      </p>

                      <p className="mt-1 text-[11px] font-bold text-white/40">
                        {standing.matchesWithVotes} wedstrijden
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 transition-[width] duration-700 ease-out"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold text-white/45">
                    <span>{standing.firstPlaceVotes}× 1e</span>
                    <span>{standing.secondPlaceVotes}× 2e</span>
                    <span>{standing.thirdPlaceVotes}× 3e</span>
                    <span>{standing.totalVotes} stemmen</span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
