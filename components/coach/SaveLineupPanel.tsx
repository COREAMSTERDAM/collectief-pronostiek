"use client";

type SaveLineupPanelProps = {
  selectedCount: number;
  requiredCount: number;
  isSaving: boolean;
  hasChanges: boolean;
  lastSavedAt: string | null;
  onSave: () => void;
};

function formatSavedAt(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SaveLineupPanel({
  selectedCount,
  requiredCount,
  isSaving,
  hasChanges,
  lastSavedAt,
  onSave,
}: SaveLineupPanelProps) {
  const isComplete = selectedCount === requiredCount;
  const canSave = selectedCount > 0 && hasChanges && !isSaving;

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
            Stap 3
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            Bewaar je opstelling
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/55">
            {isComplete
              ? "Je basiself is volledig. Bij opslaan wordt ook een historische inzending bewaard voor de latere statistieken."
              : `Je kunt je voorlopige keuze al bewaren. Nog ${
                  requiredCount - selectedCount
                } positie(s) invullen voor een volledige inzending.`}
          </p>

          {lastSavedAt ? (
            <p className="mt-2 text-xs font-bold text-emerald-200/75">
              Laatst opgeslagen: {formatSavedAt(lastSavedAt)}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 text-center sm:text-right">
          <p className="mb-2 text-sm font-black text-white">
            {selectedCount} / {requiredCount}
          </p>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="rounded-2xl border border-white bg-white px-6 py-3 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/30"
          >
            {isSaving
              ? "Opstelling opslaan…"
              : hasChanges
                ? "💾 Bewaar opstelling"
                : "✓ Alles opgeslagen"}
          </button>
        </div>
      </div>
    </section>
  );
}
