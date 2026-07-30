"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { createClient } from "@/src/lib/supabase/client";

import PlayerVoteGrid from "@/components/motm/PlayerVoteGrid";
import VoteSummary from "@/components/motm/VoteSummary";
import type { VotePlayer } from "@/components/motm/PlayerVoteCard";

const supabase = createClient();

type MatchData = {
  home_team: string;
  away_team: string;
  kickoff: string;
};

export default function ManVanDeWedstrijdPage() {
  const params = useParams();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<VotePlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function loadPageData() {
      setLoading(true);
      setErrorMessage("");

      if (!Number.isInteger(matchId) || matchId <= 0) {
        setErrorMessage("Ongeldige wedstrijd.");
        setLoading(false);
        return;
      }

      const [
        { data: matchData, error: matchError },
        { data: playerData, error: playerError },
      ] = await Promise.all([
        supabase
          .from("matches")
          .select("home_team, away_team, kickoff")
          .eq("id", matchId)
          .single(),
        supabase
          .from("players")
          .select("id, name, shirt_number, position, photo_url")
          .eq("active", true)
          .order("shirt_number", { ascending: true }),
      ]);

      if (matchError) {
        console.error("Wedstrijd ophalen mislukt:", matchError);
        setErrorMessage("De wedstrijd kon niet worden geladen.");
        setLoading(false);
        return;
      }

      if (playerError) {
        console.error("Spelers ophalen mislukt:", playerError);
        setErrorMessage("De spelers konden niet worden geladen.");
        setLoading(false);
        return;
      }

      setMatch(matchData as MatchData);
      setPlayers((playerData ?? []) as VotePlayer[]);
      setLoading(false);
    }

    void loadPageData();
  }, [matchId]);

  const formattedKickoff = match
    ? new Intl.DateTimeFormat("nl-BE", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date(match.kickoff))
    : "";

    async function handleSubmitVote() {
  if (selectedPlayerIds.length !== 3) {
    setErrorMessage("Kies eerst drie verschillende spelers.");
    return;
  }

  setSubmitting(true);
  setErrorMessage("");
  setSuccessMessage("");

  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    window.location.href = "/login?reason=login-required";
    return;
  }

  const { error } = await supabase.rpc("submit_player_top3", {
    p_match_id: matchId,
    p_first_player_id: selectedPlayerIds[0],
    p_second_player_id: selectedPlayerIds[1],
    p_third_player_id: selectedPlayerIds[2],
  });

  if (error) {
    console.error("Stem opslaan mislukt:", error);
    setErrorMessage(error.message || "Je stem kon niet worden opgeslagen.");
    setSubmitting(false);
    return;
  }

  setSuccessMessage("Je Top 3 is succesvol opgeslagen.");
  setSubmitting(false);
}

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <h1 className="ucl-title">Man van de Wedstrijd</h1>

        {match && (
          <div className="mt-4">
            <p className="text-2xl font-black text-white md:text-3xl">
              {match.home_team}
              <span className="mx-3 text-sky-300">vs</span>
              {match.away_team}
            </p>

            <p className="mt-2 font-bold text-white/55">
              {formattedKickoff}
            </p>
          </div>
        )}

        {loading && (
          <div className="ucl-card-dark mt-10 p-6">
            <p className="font-bold text-white/60">
              Wedstrijd en spelers worden geladen...
            </p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="mt-10 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
            <p className="font-bold text-red-200">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && players.length === 0 && (
          <div className="ucl-card-dark mt-10 p-6">
            <p className="font-bold text-white/60">
              Er zijn momenteel geen actieve spelers.
            </p>
          </div>
        )}

        {!loading && !errorMessage && match && players.length > 0 && (
          <div className="mt-10 space-y-8">
            <VoteSummary
              players={players}
              selectedPlayerIds={selectedPlayerIds}
              submitting={submitting}
onSubmit={handleSubmitVote}
            />

            {successMessage && (
  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
    <p className="font-bold text-emerald-200">
      {successMessage}
    </p>
  </div>
)}

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
