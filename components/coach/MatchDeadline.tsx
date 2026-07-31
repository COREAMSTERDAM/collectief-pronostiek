"use client";

type MatchDeadlineProps = {
  kickoff: string;
  now: number;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatDate(value: number) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) {
    return "Gesloten";
  }

  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}u ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}u ${minutes}m`;
  }

  return `${minutes}m`;
}

export function getMatchLineupDeadline(kickoff: string) {
  return new Date(kickoff).getTime() - TWO_HOURS_MS;
}

export default function MatchDeadline({
  kickoff,
  now,
}: MatchDeadlineProps) {
  const deadline = getMatchLineupDeadline(kickoff);
  const remaining = deadline - now;
  const isClosed = remaining <= 0;
  const closesSoon = !isClosed && remaining <= 6 * 60 * 60 * 1000;

  return (
    <section
      className={`rounded-3xl border p-5 ${
        isClosed
          ? "border-red-300/25 bg-red-400/10"
          : closesSoon
            ? "border-amber-300/25 bg-amber-400/10"
            : "border-emerald-300/20 bg-emerald-400/10"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Deadline
          </p>
          <p className="mt-1 text-sm font-bold capitalize text-white/75">
            {formatDate(deadline)}
          </p>
        </div>

        <div className="sm:text-right">
          <p
            className={`text-2xl font-black ${
              isClosed
                ? "text-red-200"
                : closesSoon
                  ? "text-amber-200"
                  : "text-emerald-200"
            }`}
          >
            {formatRemaining(remaining)}
          </p>
          <p className="mt-1 text-xs font-semibold text-white/45">
            {isClosed
              ? "De opstelling is vergrendeld."
              : "Resterende tijd om te wijzigen."}
          </p>
        </div>
      </div>
    </section>
  );
}
