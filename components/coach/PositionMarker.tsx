import type { FormationPosition } from "@/src/lib/coach";

type PositionMarkerProps = {
  position: FormationPosition;
};

export default function PositionMarker({ position }: PositionMarkerProps) {
  return (
    <button
      type="button"
      className={[
        "absolute z-10 -translate-x-1/2 -translate-y-1/2",
        "flex h-14 w-14 items-center justify-center rounded-full",
        "border border-white/35 bg-black/75 shadow-xl shadow-black/35 backdrop-blur",
        "transition hover:scale-105 hover:border-amber-300/70 hover:bg-black/90",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300",
        "sm:h-16 sm:w-16",
      ].join(" ")}
      style={{
        left: `${position.x_percent}%`,
        top: `${position.y_percent}%`,
      }}
      title={position.position_label}
      aria-label={`${position.position_label} kiezen`}
    >
      <span className="text-center text-[11px] font-black leading-none text-white sm:text-xs">
        {position.position_code}
      </span>
    </button>
  );
}
