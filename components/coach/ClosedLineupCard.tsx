import Link from "next/link";
import type { ClosedCoachLineup } from "@/src/lib/coach-lineup-history";

type ClosedLineupCardProps = {
  lineup: ClosedCoachLineup;
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

function formatScore(value: number) {
  return value.toFixed(2).replace(".", ",");
}

export default function ClosedLineupCard({
  lineup,
}: ClosedLineupCardProps) {
  return (
    <article className="ucl-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white/55">
          🔒 Gesloten
        </span>

        <span
          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${
            lineup.has_submission
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/35"
          }`}
        >
          {lineup.has_submission
            ? "Definitief ingediend"
            : "Concept bewaard"}
        </span>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
          Wedstrijd
        </p>

        <h2 className="mt-4 text-2xl font-black text-white">
          {lineup.home_team}
        </h2>

        <p className="my-2 text-xs font-black uppercase tracking-[0.25em] text-amber-200/60">
          VS
        </p>

        <h2 className="text-2xl font-black text-white">
          {lineup.away_team}
        </h2>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase text-white/35">
            Aftrap
          </p>
          <p className="mt-2 text-sm font-bold capitalize text-white/70">
            {formatDate(lineup.kickoff)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-black uppercase text-white/35">
            Formatie
          </p>
          <p className="mt-2 text-lg font-black text-white">
            {lineup.formation_name ?? "Niet gekozen"}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-sm font-bold text-white/55">
          {lineup.selected_player_count} spelers geselecteerd
        </p>

        {lineup.coach_score !== null ? (
          <p className="text-lg font-black text-amber-200">
            {formatScore(lineup.coach_score)} punten
          </p>
        ) : (
          <p className="text-xs font-bold text-white/35">
            Nog geen coachscore
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/iedereen-coach/${lineup.match_id}`}
          className="ucl-button-primary !mt-0"
        >
          👁️ Mijn basiself bekijken
        </Link>

        <Link
          href={`/iedereen-coach/${lineup.match_id}/collectief`}
          className="ucl-button-secondary"
        >
          👥 Collectieve basiself
        </Link>
      </div>
    </article>
  );
}
