import type { CollectiveFormationStat } from "@/src/lib/coach";

type FormationStatsProps = {
  formations: CollectiveFormationStat[];
};

export default function FormationStats({
  formations,
}: FormationStatsProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
          Formatiekeuze
        </p>
        <h2 className="mt-1 text-xl font-black text-white">
          Populairste formaties
        </h2>
      </div>

      {formations.length === 0 ? (
        <p className="text-sm text-white/45">
          Nog geen formatiedata beschikbaar.
        </p>
      ) : (
        <div className="space-y-4">
          {formations.map((formation, index) => (
            <article key={formation.formation_id}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-white">
                    {index + 1}. {formation.formation_name}
                  </p>
                  <p className="text-xs font-semibold text-white/40">
                    {formation.coach_count}{" "}
                    {formation.coach_count === 1 ? "coach" : "coaches"}
                  </p>
                </div>

                <span className="text-lg font-black text-amber-200">
                  {formation.percentage}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white to-amber-300"
                  style={{
                    width: `${Math.min(100, formation.percentage)}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
