import type { CollectiveLineupPlayer } from "@/src/lib/coach";

type CollectivePitchProps = {
  formationName: string;
  players: CollectiveLineupPlayer[];
};

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

export default function CollectivePitch({
  formationName,
  players,
}: CollectivePitchProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/25 sm:p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-white/45">
            Community
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            Collectieve basiself
          </h2>
        </div>

        <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
          {formationName}
        </span>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div className="relative aspect-[68/105] overflow-hidden rounded-[2rem] border-2 border-white/40 bg-gradient-to-b from-zinc-700 via-zinc-800 to-zinc-900 shadow-inner shadow-black/50">
          <div className="absolute inset-0 opacity-90">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/35" />
            <div className="absolute left-1/2 top-1/2 aspect-square h-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45" />
            <div className="absolute left-1/2 top-0 h-[16%] w-[48%] -translate-x-1/2 border-x border-b border-white/35" />
            <div className="absolute left-1/2 top-0 h-[7%] w-[22%] -translate-x-1/2 border-x border-b border-white/35" />
            <div className="absolute bottom-0 left-1/2 h-[16%] w-[48%] -translate-x-1/2 border-x border-t border-white/35" />
            <div className="absolute bottom-0 left-1/2 h-[7%] w-[22%] -translate-x-1/2 border-x border-t border-white/35" />
            <div className="absolute inset-[3%] rounded-[1.4rem] border border-white/35" />
          </div>

          {players.map((player) => (
            <article
              key={`${player.position_code}-${player.player_id}`}
              className="absolute z-10 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-28"
              style={{
                left: `${player.x_percent}%`,
                top: `${player.y_percent}%`,
              }}
            >
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white/75 bg-black text-xs font-black text-white shadow-xl shadow-black/50 sm:h-14 sm:w-14">
                  {player.photo_url ? (
                    <img
                      src={player.photo_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials(player.player_name)
                  )}
                </div>

                <span className="absolute -right-3 -top-2 rounded-full border border-amber-200/40 bg-amber-300 px-2 py-0.5 text-[9px] font-black text-black shadow-lg">
                  {player.position_percentage}%
                </span>
              </div>

              <div className="mt-1 w-full rounded-lg border border-white/20 bg-black/85 px-1.5 py-1 shadow-lg shadow-black/40">
                <p className="break-words text-[9px] font-black leading-tight text-white sm:text-[10px]">
                  {player.player_name}
                </p>
                <p className="mt-0.5 text-[8px] font-bold text-white/45">
                  {player.position_code}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
