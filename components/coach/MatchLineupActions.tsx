"use client";

type MatchLineupActionsProps = {
  starterCount: number;
  requiredStarterCount: number;
  substituteCount: number;
  requiredSubstituteCount: number;
  isClosed: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  hasChanges: boolean;
  hasSavedLineup: boolean;
  lastSavedAt: string | null;
  onSave: () => void;
  onSubmit: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MatchLineupActions({
  starterCount,
  requiredStarterCount,
  substituteCount,
  requiredSubstituteCount,
  isClosed,
  isSaving,
  isSubmitting,
  hasChanges,
  hasSavedLineup,
  lastSavedAt,
  onSave,
  onSubmit,
}: MatchLineupActionsProps) {
  const isComplete =
    starterCount === requiredStarterCount &&
    substituteCount === requiredSubstituteCount;

  const totalCount = starterCount + substituteCount;
  const busy = isSaving || isSubmitting;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/40">
            Jouw selectie
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            {totalCount} van 16 spelers geselecteerd
          </h2>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white/60">
              Basis: {starterCount}/{requiredStarterCount}
            </span>

            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-black text-white/60">
              Bank: {substituteCount}/{requiredSubstituteCount}
            </span>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
            Bewaar tussentijds als concept. Voor definitief indienen zijn elf
            basisspelers en vijf bankzitters vereist. Alle zestien spelers
            tellen mee voor de latere coachscore wanneer ze een definitief
            gemiddelde ontvangen.
          </p>

          {lastSavedAt ? (
            <p className="mt-2 text-xs font-bold text-emerald-200/70">
              Laatst opgeslagen: {formatDate(lastSavedAt)}
            </p>
          ) : null}
        </div>

        <div className="grid shrink-0 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onSave}
            disabled={
              isClosed ||
              busy ||
              totalCount === 0 ||
              (!hasChanges && hasSavedLineup)
            }
            className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {isSaving
              ? "Concept bewaren…"
              : hasChanges || !hasSavedLineup
                ? "💾 Concept bewaren"
                : "✓ Concept opgeslagen"}
          </button>

          <button
            type="button"
            onClick={onSubmit}
            disabled={isClosed || busy || !isComplete}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
          >
            {isSubmitting
              ? "Definitief indienen…"
              : "✓ Selectie indienen"}
          </button>
        </div>
      </div>

      {isClosed ? (
        <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm font-bold text-red-100">
          🔒 De deadline is verstreken. Deze selectie kan niet meer worden
          gewijzigd of ingediend.
        </div>
      ) : !isComplete ? (
        <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm font-bold text-amber-100">
          Nog {requiredStarterCount - starterCount} veldpositie(s) en{" "}
          {requiredSubstituteCount - substituteCount} bankpositie(s) invullen.
        </div>
      ) : null}
    </section>
  );
}
