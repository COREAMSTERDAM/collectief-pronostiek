"use client";

import { useState } from "react";

import PlayerVoteGrid from "@/components/motm/PlayerVoteGrid";
import VoteSummary from "@/components/motm/VoteSummary";
import type { VotePlayer } from "@/components/motm/PlayerVoteCard";

export default function ManVanDeWedstrijdPage() {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);

  // Tijdelijke testdata
  const players: VotePlayer[] = [
    {
      id: 1,
      name: "Hans Vanaken",
      shirt_number: 20,
      position: "Middenvelder",
      photo_url: null,
    },
    {
      id: 2,
      name: "Brandon Mechele",
      shirt_number: 44,
      position: "Verdediger",
      photo_url: null,
    },
    {
      id: 3,
      name: "Simon Mignolet",
      shirt_number: 22,
      position: "Doelman",
      photo_url: null,
    },
    {
      id: 4,
      name: "Ferran Jutglà",
      shirt_number: 9,
      position: "Aanvaller",
      photo_url: null,
    },
  ];

  return (
    <main className="ucl-page">
      <div className="ucl-container">

        <h1 className="ucl-title">
          Man van de Wedstrijd
        </h1>

        <p className="ucl-subtitle">
          Kies jouw Top 3
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">

          <PlayerVoteGrid
            players={players}
            selectedPlayerIds={selectedPlayerIds}
            onChange={setSelectedPlayerIds}
          />

          <VoteSummary
            players={players}
            selectedPlayerIds={selectedPlayerIds}
            onSubmit={() => alert("Nog te bouwen")}
          />

        </div>

      </div>
    </main>
  );
}