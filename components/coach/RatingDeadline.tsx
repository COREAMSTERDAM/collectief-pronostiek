"use client";

type RatingDeadlineProps = {
  deadline: string;
  isOpen: boolean;
  isFinalized: boolean;
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

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) return "Afgesloten";

  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}u ${minutes}m`;
  if (hours > 0) return `${hours}u ${minutes}m`;
  return `${minutes}m`;
}

export default function RatingDeadline({
  deadline,
  isOpen,
  isFinalized,
  now,
}: RatingDeadlineProps) {
  const remaining = new Date(deadline).getTime() - now;

  return (
    <section
      className={`rounded-3xl border p-5 ${
        isFinalized
          ? "border-emerald-300/25 bg-emerald-400/10"
          : isOpen
            ? "border-amber-300/25 bg-amber-400/10"
            : "border-white/10 bg-white/[0.04]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
            Beoordelingsdeadline
          </p>
          <p className="mt-1 text-sm font-bold capitalize text-white/70">
            {formatDate(deadline)}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-2xl font-black text-white">
            {isFinalized
              ? "Gefinaliseerd"
              : isOpen
                ? formatRemaining(remaining)
                : "Niet open"}
          </p>
          <p className="mt-1 text-xs text-white/40">
            {isFinalized
              ? "De definitieve gemiddelden zijn beschikbaar."
              : isOpen
                ? "Resterende tijd om cijfers aan te passen."
                : "Beoordelen kan pas vanaf de aftrap."}
          </p>
        </div>
      </div>
    </section>
  );
}
