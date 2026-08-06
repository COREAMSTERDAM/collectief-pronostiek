import type {
  RatingArchiveMatch,
  RatingArchivePlayer,
} from "@/src/lib/rating-archive";

type RatingArchiveMatchCardProps = {
  match: RatingArchiveMatch;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

function PlayerResult({
  player,
  position,
}: {
  player: RatingArchivePlayer;
  position: number;
}) {
  return (
    <article className="grid grid-cols-[2.25rem_3rem_minmax(0,1fr)_4.5rem] items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-black text-white/55">
        {position}
      </div>

      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-xs font-black text-white">
        {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={`Foto van ${player.player_name}`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials(player.player_name)
        )}
      </div>

      <div className="min-w-0">
        <p className="whitespace-normal break-words text-sm font-bold leading-tight text-white">
          {player.player_name}
        </p>

        <p className="mt-1 text-xs text-white/40">
          {player.shirt_number !== null
            ? `Nr. ${player.shirt_number}`
            : "Geen rugnummer"}
          {" · "}
          {player.position ?? "Geen positie"}
        </p>
      </div>

      <div className="text-right">
        <p className="text-lg font-black leading-none tabular-nums text-amber-200">
          {player.average_rating.toFixed(1).replace(".", ",")}
        </p>

        <p className="text-[10px] font-black uppercase tracking-wide text-white/30">
          gemiddeld
        </p>
      </div>
    </article>
  );
}

export default function RatingArchiveMatchCard({
  match,
}: RatingArchiveMatchCardProps) {
  return (
    <article className="ucl-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="inline-flex rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-emerald-200">
          ✓ Beoordeling afgesloten
        </span>

        <span className="text-xs font-bold capitalize text-white/40">
          {formatDate(match.kickoff)}
        </span>
      </div>

      <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-5 text-center">
        <h2 className="text-2xl font-black text-white">
          {match.home_team}
        </h2>

        <p className="my-2 text-xs font-black uppercase tracking-[0.25em] text-amber-200/60">
          VS
        </p>

        <h2 className="text-2xl font-black text-white">
          {match.away_team}
        </h2>
      </div>

      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
              Eindresultaten
            </p>

            <h3 className="mt-1 text-xl font-black text-white">
              Gemiddelde spelersscores
            </h3>
          </div>

          <p className="text-xs font-semibold text-white/35">
            Hoogste score eerst
          </p>
        </div>

        {match.players.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
            <p className="text-sm font-semibold text-white/45">
              Voor deze wedstrijd zijn geen definitieve spelersscores beschikbaar.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {match.players.map((player, index) => (
              <PlayerResult
                key={player.player_id}
                player={player}
                position={index + 1}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}