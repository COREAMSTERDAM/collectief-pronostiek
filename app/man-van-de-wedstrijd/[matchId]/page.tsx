"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/src/lib/supabase";

import PlayerVoteGrid from "@/components/motm/PlayerVoteGrid";
import VoteSummary from "@/components/motm/VoteSummary";
import type { VotePlayer } from "@/components/motm/PlayerVoteCard";

type MatchData = {
  home_team: string;
  away_team: string;
  kickoff: string;
};

type ExistingVote = {
  player_id: number;
  rank: number;
};

export default function ManVanDeWedstrijdPage() {
  const params = useParams();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<MatchData | null>(null);
  const [players, setPlayers] = useState<VotePlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadPageData() {
      setLoading(true);
      setErrorMessage("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        window.location.href = "/login?reason=login-required";
        return;
      }

      if (!Number.isInteger(matchId) || matchId <= 0) {
        setErrorMessage("Ongeldige wedstrijd.");
        setLoading(false);
        return;
      }

      const [
        { data: matchData, error: matchError },
        { data: playerData, error: playerError },
        { data: existingVoteData, error: existingVoteError },
      ] = await Promise.all([
        supabase
          .from("matches")
          .select("home_team, away_team, kickoff")
          .eq("id", matchId)
          .maybeSingle(),

        supabase
          .from("players")
          .select("id, name, shirt_number, position, photo_url")
          .eq("active", true)
          .order("shirt_number", { ascending: true }),

        supabase
          .from("player_rankings")
          .select("player_id, rank")
          .eq("match_id", matchId)
          .eq("user_id", userData.user.id)
          .order("rank", { ascending: true }),
      ]);

      if (matchError || playerError || existingVoteError) {
        console.error("Laadfouten:", {
          matchError,
          playerError,
          existingVoteError,
        });

        const error = matchError ?? playerError ?? existingVoteError;
        const query = matchError
          ? "matches"
          : playerError
            ? "players"
            : "player_rankings";

        setErrorMessage(
          [
            `Query: ${query}`,
            `Code: ${error?.code || "onbekend"}`,
            `Melding: ${error?.message || "onbekend"}`,
            error?.details ? `Details: ${error.details}` : null,
            error?.hint ? `Hint: ${error.hint}` : null,
          ]
            .filter(Boolean)
            .join(" — "),
        );

        setLoading(false);
        return;
      }

      if (!matchData) {
        setErrorMessage("Deze wedstrijd werd niet gevonden.");
        setLoading(false);
        return;
      }

      const existingPlayerIds = (
        (existingVoteData ?? []) as ExistingVote[]
      )
        .sort((a, b) => a.rank - b.rank)
        .map((vote) => vote.player_id);

      setMatch(matchData as MatchData);
      setPlayers((playerData ?? []) as VotePlayer[]);
      setSelectedPlayerIds(existingPlayerIds);
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
              Wedstrijd, spelers en je stem worden geladen...
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