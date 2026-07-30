"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { createClient } from "@/src/lib/supabase/client";

import PlayerVoteGrid from "@/components/motm/PlayerVoteGrid";
import VoteSummary from "@/components/motm/VoteSummary";
import type { VotePlayer } from "@/components/motm/PlayerVoteCard";

const supabase = createClient();

export default function ManVanDeWedstrijdPage() {
  const params = useParams();
  const matchId = Number(params.matchId);

  const [players, setPlayers] = useState<VotePlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("players")
        .select("id, name, shirt_number, position, photo_url")
        .eq("active", true)
        .order("shirt_number", { ascending: true });

      if (error) {
        console.error("Spelers ophalen mislukt:", error);
        setErrorMessage("De spelers konden niet worden geladen.");
        setLoading(false);
        return;
      }

      setPlayers((data ?? []) as VotePlayer[]);
      setLoading(false);
    }

    void loadPlayers();
  }, []);

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <h1 className="ucl-title">
          Man van de Wedstrijd
        </h1>

        <p className="ucl-subtitle">
          Kies jouw Top 3
        </p>

        <div className="mt-4 text-sm font-bold text-white/40">
          Wedstrijd ID: {matchId}
        </div>

        {loading && (
          <div className="ucl-card-dark mt-10 p-6">
            <p className="font-bold text-white/60">
              Spelers worden geladen...
            </p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="mt-10 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
            <p className="font-bold text-red-200">
              {errorMessage}
            </p>
          </div>
        )}

        {!loading && !errorMessage && players.length === 0 && (
          <div className="ucl-card-dark mt-10 p-6">
            <p className="font-bold text-white/60">
              Er zijn momenteel geen actieve spelers.
            </p>
          </div>
        )}

        {!loading && !errorMessage && players.length > 0 && (
          <div className="mt-10 space-y-8">
            <VoteSummary
              players={players}
              selectedPlayerIds={selectedPlayerIds}
              onSubmit={() => alert("Nog te bouwen")}
            />

            <PlayerVoteGrid
              players={players}
              selectedPlayerIds={selectedPlayerIds}
              onChange={setSelectedPlayerIds}
            />
          </div>
        )}
      </div>
    </main>
  );
}