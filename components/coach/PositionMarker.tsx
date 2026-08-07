"use client";

import type {
  CoachPlayer,
  FormationPosition,
} from "@/src/lib/coach";

type PositionMarkerProps = {
  position: FormationPosition;
  player: CoachPlayer | null;
  disabled?: boolean;
  onClick: (position: FormationPosition) => void;
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

export default function PositionMarker({
  position,
  player,
  disabled = false,
  onClick,
}: PositionMarkerProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(position)}
      className={[
        "absolute z-10 -translate-x-1/2 -translate-y-1/2",
        "flex flex-col items-center justify-center",
        "transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
        disabled
          ? "cursor-not-allowed opacity-75"
          : "hover:scale-105",
        player ? "w-16 sm:w-24" : "h-14 w-14 sm:h-16 sm:w-16",
      ].join(" ")}
      style={{
        left: `${position.x_percent}%`,
        top: `${position.y_percent}%`,
      }}
      title={
        disabled
          ? "De opstelling is gesloten."
          : player
            ? `${player.name} wijzigen op ${position.position_label}`
            : `${position.position_label} kiezen`
      }
      aria-label={
        player
          ? `${player.name} op ${position.position_label}`
          : position.position_label
      }
    >
      {player ? (
        <>
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-black/80 text-[11px] font-black text-white shadow-xl shadow-black/50 sm:h-14 sm:w-14 sm:text-xs">
            {player.photo_url ? (
              <img
                src={player.photo_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              initials(player.name)
            )}
          </span>

          <span className="mt-1 w-full rounded-lg border border-white/20 bg-black/85 px-1.5 py-1 text-center text-[9px] font-black leading-tight text-white shadow-lg shadow-black/40 sm:text-[10px]">
            {player.name}
          </span>
        </>
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full border border-white/35 bg-black/75 text-center text-[11px] font-black leading-none text-white shadow-xl shadow-black/35 backdrop-blur sm:text-xs">
          {position.position_code}
        </span>
      )}
    </button>
  );
}