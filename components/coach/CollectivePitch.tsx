import type { CollectiveLineupPlayer } from "@/src/lib/coach";

type CollectivePitchProps = {
  formationName: string;
  players: CollectiveLineupPlayer[];
};

type ExtendedCollectivePlayer = CollectiveLineupPlayer & {
  selection_type?: string | null;
  bench_order?: number | null;
  position_group?: string | null;
  sort_order?: number | null;
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

function isSubstitute(player: ExtendedCollectivePlayer) {
  const selectionType = player.selection_type?.toLowerCase();
  const positionGroup = player.position_group?.toLowerCase();
  const positionCode = player.position_code?.toLowerCase() ?? "";

  return (
    selectionType === "substitute" ||
    positionGroup === "substitute" ||
    positionCode.startsWith("bench") ||
    positionCode.startsWith("sub")
  );
}

function PlayerAvatar({
  player,
  size = "field",
}: {
  player: ExtendedCollectivePlayer;
  size?: "field" | "bench";
}) {
  const avatarClass =
    size === "bench"
      ? "h-14 w-14 sm:h-16 sm:w-16"
      : "h-12 w-12 sm:h-14 sm:w-14";

  return (
    <div className="relative">
      <div
        className={`flex items-center justify-center overflow-hidden rounded-full border-2 border-white/75 bg-black text-xs font-black text-white shadow-xl shadow-black/50 ${avatarClass}`}
      >
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
  );
}

export default function CollectivePitch({
  formationName,
  players,
}: CollectivePitchProps) {
  const extendedPlayers = players as ExtendedCollectivePlayer[];

  const starters = extendedPlayers.filter(
    (player) => !isSubstitute(player),
  );

  const substitutes = extendedPlayers
    .filter(isSubstitute)
    .sort((a, b) => {
      const aOrder =
        a.bench_order ??
        a.sort_order ??
        Number.MAX_SAFE_INTEGER;
      const bOrder =
        b.bench_order ??
        b.sort_order ??
        Number.MAX_SAFE_INTEGER;

      return aOrder - bOrder;
    });

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
            {/* Buitenlijn */}
            <div className="absolute inset-[3%] rounded-[1.4rem] border border-white/35" />

            {/* Horizontale middellijn */}
            <div className="absolute left-[3%] right-[3%] top-1/2 h-px -translate-y-1/2 bg-white/35" />

            {/* Middencirkel en middenstip */}
            <div className="absolute left-1/2 top-1/2 aspect-square h-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/45" />

            {/* Bovenste strafschopgebied */}
            <div className="absolute left-1/2 top-[3%] h-[16%] w-[48%] -translate-x-1/2 border-x border-b border-white/35" />
            <div className="absolute left-1/2 top-[3%] h-[7%] w-[22%] -translate-x-1/2 border-x border-b border-white/35" />

            {/* Onderste strafschopgebied */}
            <div className="absolute bottom-[3%] left-1/2 h-[16%] w-[48%] -translate-x-1/2 border-x border-t border-white/35" />
            <div className="absolute bottom-[3%] left-1/2 h-[7%] w-[22%] -translate-x-1/2 border-x border-t border-white/35" />
          </div>

          {starters.map((player) => (
            <article
              key={`${player.position_code}-${player.player_id}`}
              className="absolute z-10 flex w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-28"
              style={{
                left: `${player.x_percent}%`,
                top: `${player.y_percent}%`,
              }}
            >
              <PlayerAvatar player={player} />

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

        {substitutes.length > 0 ? (
          <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-black/30 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  Bankzitters
                </p>

                <p className="mt-1 text-xs font-semibold text-white/35">
                  Collectief gekozen reservespelers
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white/50">
                {substitutes.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {substitutes.map((player, index) => (
                <article
                  key={`substitute-${player.player_id}-${index}`}
                  className="flex min-w-0 flex-col items-center rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center shadow-lg shadow-black/20"
                >
                  <PlayerAvatar player={player} size="bench" />

                  <div className="mt-3 min-w-0 w-full">
                    <p className="break-words text-[10px] font-black leading-tight text-white sm:text-xs">
                      {player.player_name}
                    </p>

                    <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-white/35">
                      Bank {player.bench_order ?? index + 1}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
