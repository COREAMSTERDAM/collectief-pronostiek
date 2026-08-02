import Link from "next/link";
import type { OpenRatingMatch } from "@/src/lib/open-match-ratings";

type Props = { match: OpenRatingMatch };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OpenRatingMatchCard({ match }: Props) {
  const progress = match.active_player_count === 0
    ? 0
    : Math.round((match.my_rating_count / match.active_player_count) * 100);

  return (
    <article className="ucl-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="inline-flex rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-amber-100">
          ⭐ Beoordelen open
        </span>
        <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${match.is_complete ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-white/5 text-white/50"}`}>
          {match.is_complete ? "Volledig opgeslagen" : `${progress}% ingevuld`}
        </span>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
        <h2 className="text-2xl font-black text-white">{match.home_team}</h2>
        <p className="my-2 text-xs font-black uppercase tracking-[0.25em] text-amber-200/60">VS</p>
        <h2 className="text-2xl font-black text-white">{match.away_team}</h2>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase text-white/35">Aftrap</p>
          <p className="mt-2 text-sm font-bold capitalize text-white/70">{formatDate(match.kickoff)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase text-white/35">Deadline beoordeling</p>
          <p className="mt-2 text-sm font-bold capitalize text-white/70">{formatDate(match.rating_deadline)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-white/45">
          <span>{match.my_rating_count} van {match.active_player_count} spelers</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-white to-amber-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <Link href={`/iedereen-coach/${match.match_id}/beoordelen`} className="ucl-button-primary mt-5">
        {match.is_complete ? "Beoordelingen bekijken of aanpassen" : "Spelers beoordelen"}
      </Link>
    </article>
  );
}
