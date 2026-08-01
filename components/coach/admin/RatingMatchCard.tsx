import Link from "next/link";
import type { RatingAdminMatch } from "@/src/lib/coach-rating-admin";

type RatingMatchCardProps = {
  match: RatingAdminMatch;
};

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

export default function RatingMatchCard({
  match,
}: RatingMatchCardProps) {
  const isFinalized = match.finalized_at !== null;
  const deadlinePassed =
    Date.now() >= new Date(match.rating_deadline).getTime();

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-white/35">
            Wedstrijd #{match.id}
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            {match.home_team}
            <span className="mx-2 text-amber-200/60">VS</span>
            {match.away_team}
          </h2>
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-xs font-black ${
            isFinalized
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
              : deadlinePassed
                ? "border-amber-300/25 bg-amber-400/10 text-amber-200"
                : "border-white/15 bg-white/5 text-white/55"
          }`}
        >
          {isFinalized
            ? "Gefinaliseerd"
            : deadlinePassed
              ? "Klaar voor finalisatie"
              : "Voorbereiding"}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase text-white/35">
            Aftrap
          </p>
          <p className="mt-2 text-sm font-bold capitalize text-white/70">
            {formatDate(match.kickoff)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase text-white/35">
            Deadline
          </p>
          <p className="mt-2 text-sm font-bold capitalize text-white/70">
            {formatDate(match.rating_deadline)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase text-white/35">
            Actieve spelers
          </p>
          <p className="mt-2 text-2xl font-black text-white">
            {match.active_player_count}
          </p>
        </div>
      </div>

      <Link
        href={`/admin/coach-wedstrijden/${match.id}`}
        className="mt-5 block rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-zinc-200"
      >
        Beheer actieve spelers
      </Link>
    </article>
  );
}
