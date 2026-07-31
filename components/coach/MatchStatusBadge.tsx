import type { CoachMatchOverview } from "@/src/lib/coach-match";
import { getCoachMatchStatus } from "@/src/lib/coach-match";

type MatchStatusBadgeProps = {
  match: CoachMatchOverview;
  now?: number;
};

export default function MatchStatusBadge({
  match,
  now = Date.now(),
}: MatchStatusBadgeProps) {
  const status = getCoachMatchStatus(match, now);

  const classes =
    status.key === "open"
      ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
      : status.key === "closing-soon"
        ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
        : "border-red-300/30 bg-red-400/10 text-red-200";

  const icon =
    status.key === "open"
      ? "🟢"
      : status.key === "closing-soon"
        ? "🟡"
        : "🔴";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${classes}`}
      title={status.description}
    >
      <span>{icon}</span>
      {status.label}
    </span>
  );
}
