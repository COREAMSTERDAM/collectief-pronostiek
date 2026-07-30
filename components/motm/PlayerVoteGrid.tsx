"use client";

import PlayerVoteCard, { VotePlayer } from "./PlayerVoteCard";

type PlayerVoteGridProps = {
  players: VotePlayer[];
  selectedPlayerIds: number[];
  disabled?: boolean;
  onChange: (playerIds: number[]) => void;
};

export default function PlayerVoteGrid({
  players,
  selectedPlayerIds,
  disabled = false,
  onChange,
}: PlayerVoteGridProps) {
  function handleSelect(player: VotePlayer) {
    if (disabled) return;

    const existingIndex = selectedPlayerIds.indexOf(player.id);

    // Speler is al geselecteerd: verwijderen en rangen opschuiven.
    if (existingIndex !== -1) {
      onChange(
        selectedPlayerIds.filter((playerId) => playerId !== player.id),
      );
      return;
    }

    // Er mogen maximaal drie spelers gekozen worden.
    if (selectedPlayerIds.length >= 3) {
      return;
    }

    onChange([...selectedPlayerIds, player.id]);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {players.map((player) => {
        const selectedIndex = selectedPlayerIds.indexOf(player.id);

        const rank =
          selectedIndex === -1
            ? null
            : ((selectedIndex + 1) as 1 | 2 | 3);

        const selectionIsFull =
          selectedPlayerIds.length >= 3 && selectedIndex === -1;

        return (
          <PlayerVoteCard
            key={player.id}
            player={player}
            rank={rank}
            disabled={disabled || selectionIsFull}
            onSelect={handleSelect}
          />
        );
      })}
    </div>
  );
}