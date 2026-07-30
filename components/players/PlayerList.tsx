"use client";

import PlayerCard, {
  PlayerCardPlayer,
} from "./PlayerCard";

type PlayerListProps = {
  players: PlayerCardPlayer[];
  totalPlayers: number;
  changingStatusId: number | null;
  onEdit: (player: PlayerCardPlayer) => void;
  onToggleStatus: (player: PlayerCardPlayer) => void;
};

export default function PlayerList({
  players,
  totalPlayers,
  changingStatusId,
  onEdit,
  onToggleStatus,
}: PlayerListProps) {
  if (players.length === 0) {
    return (
      <div className="ucl-card-dark">
        <p className="ucl-muted">
          {totalPlayers === 0
            ? "Er zijn nog geen spelers toegevoegd."
            : "Geen spelers gevonden voor deze zoekopdracht."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          changingStatus={changingStatusId === player.id}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
        />
      ))}
    </div>
  );
}