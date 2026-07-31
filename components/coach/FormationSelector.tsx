"use client";

import type { Formation } from "@/src/lib/coach";

type FormationSelectorProps = {
  formations: Formation[];
  selectedFormationId: number | null;
  disabled?: boolean;
  onChange: (formationId: number) => void;
};

export default function FormationSelector({
  formations,
  selectedFormationId,
  disabled = false,
  onChange,
}: FormationSelectorProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
          Stap 1
        </p>
        <h2 className="mt-1 text-xl font-black text-white">
          Kies je formatie
        </h2>
        <p className="mt-1 text-sm leading-6 text-white/60">
          De posities op het veld worden rechtstreeks uit Supabase geladen.
        </p>
      </div>

      {formations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center text-sm text-white/55">
          Er zijn momenteel geen actieve formaties.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {formations.map((formation) => {
            const isSelected = formation.id === selectedFormationId;

            return (
              <button
                key={formation.id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(formation.id)}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                  disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5",
                  isSelected
                    ? "border-amber-300/60 bg-amber-300/15 shadow-lg shadow-amber-500/10"
                    : "border-white/10 bg-white/[0.035] hover:border-white/25 hover:bg-white/[0.065]",
                ].join(" ")}
                aria-pressed={isSelected}
              >
                <span className="block text-lg font-black text-white">
                  {formation.name}
                </span>
                <span className="mt-1 block text-xs font-semibold text-white/45">
                  {formation.player_count} spelers
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
