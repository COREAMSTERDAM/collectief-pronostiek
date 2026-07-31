"use client";

import Link from "next/link";
import type { CoachMatchOverview } from "@/src/lib/coach-match";
import MatchStatusBadge from "@/components/coach/MatchStatusBadge";

type CoachMatchCardProps = {
  match: CoachMatchOverview;
  now: number;
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

export default function CoachMatchCard({
  match,
  now,
}: CoachMatchCardProps) {
  const deadlineHasPassed =
    new Date(match.deadline).getTime() <= now || !match.is_open;

  const lineupStatus = match.is_complete
    ? "Volledige basiself opgeslagen"
    : match.has_lineup
      ? "Concept opgeslagen"
      : "Nog niet gestart";

  const editorHref = `/iedereen-coach/${match.match_id}`;
  const collectiveHref =
    `/iedereen-coach/${match.match_id}/collectief`;

  const editorLabel = match.has_lineup
    ? "Verder bewerken"
    : "Stel je basiself samen";

  return (
    <article className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <MatchStatusBadge match={match} now={now} />

          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-black ${
              match.is_complete
                ? "border-sky-300/25 bg-sky-400/10 text-sky-200"
                : match.has_lineup
                  ? "border-white/15 bg-white/5 text-white/60"
                  : "border-white/10 bg-black/20 text-white/35"
            }`}
          >
            {lineupStatus}
          </span>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
            Wedstrijd
          </p>

          <h2 className="mt-4 break-words text-2xl font-black text-white">
            {match.home_team}
          </h2>

          <p className="my-2 text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            VS
          </p>

          <h2 className="break-words text-2xl font-black text-white">
            {match.away_team}
          </h2>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-white/35">
              Aftrap
            </p>
            <p className="mt-2 text-sm font-bold capitalize text-white/75">
              {formatDate(match.kickoff)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-black uppercase tracking-wide text-white/35">
              Deadline
            </p>
            <p className="mt-2 text-sm font-bold capitalize text-white/75">
              {formatDate(match.deadline)}
            </p>
          </div>
        </div>

        {match.updated_at ? (
          <p className="mt-4 text-center text-xs font-semibold text-white/35">
            Laatst bijgewerkt op {formatDate(match.updated_at)}
          </p>
        ) : null}
      </div>

      <div className="border-t border-white/10 p-4 sm:p-5">
        <div
          className={
            deadlineHasPassed
              ? "grid gap-3"
              : "grid gap-3 sm:grid-cols-2"
          }
        >
          {!deadlineHasPassed ? (
            <Link
              href={editorHref}
              className="block rounded-2xl bg-white px-5 py-3 text-center text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-zinc-200"
            >
              {editorLabel}
            </Link>
          ) : null}

          <Link
            href={collectiveHref}
            className="block rounded-2xl border border-amber-300/25 bg-amber-300/10 px-5 py-3 text-center text-sm font-black text-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-300/15"
          >
            👥 Collectieve basiself
          </Link>
        </div>

        {!deadlineHasPassed ? (
          <p className="mt-3 text-center text-xs font-semibold text-white/35">
            De collectieve basiself toont alleen inzendingen van deze wedstrijd.
          </p>
        ) : null}
      </div>
    </article>
  );
}