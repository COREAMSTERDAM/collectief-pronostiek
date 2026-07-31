import type { FormationPosition } from "@/src/lib/coach";
import PositionMarker from "@/components/coach/PositionMarker";

type FootballPitchProps = {
  formationName: string;
  positions: FormationPosition[];
};

export default function FootballPitch({
  formationName,
  positions,
}: FootballPitchProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/25 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
            Stap 2
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Jouw veld
          </h2>
        </div>

        <div className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
          {formationName}
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="relative aspect-[68/105] overflow-hidden rounded-[2rem] border-2 border-white/40 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 shadow-inner shadow-black/50">
          <div className="absolute inset-0 opacity-90">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/35" />
            <div className="absolute left-1/2 top-1/2 h-[18%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45" />

            <div className="absolute left-1/2 top-0 h-[16%] w-[48%] -translate-x-1/2 border-x border-b border-white/35" />
            <div className="absolute left-1/2 top-0 h-[7%] w-[22%] -translate-x-1/2 border-x border-b border-white/35" />
            <div className="absolute left-1/2 top-[10.5%] h-2 w-2 -translate-x-1/2 rounded-full bg-white/45" />

            <div className="absolute bottom-0 left-1/2 h-[16%] w-[48%] -translate-x-1/2 border-x border-t border-white/35" />
            <div className="absolute bottom-0 left-1/2 h-[7%] w-[22%] -translate-x-1/2 border-x border-t border-white/35" />
            <div className="absolute bottom-[10.5%] left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/45" />

            <div className="absolute inset-[3%] rounded-[1.4rem] border border-white/35" />
          </div>

          {positions.map((position) => (
            <PositionMarker key={position.id} position={position} />
          ))}
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-white/45">
        In Sprint 3 worden deze positiecirkels klikbaar en koppel je er spelers aan.
      </p>
    </section>
  );
}
