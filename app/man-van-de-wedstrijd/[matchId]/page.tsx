"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { supabase } from "@/src/lib/supabase";
import {
  buildMotmStandings,
  getActiveMotmPlayers,
  getMatchRankingRows,
  getMotmMatch,
  getUserMotmVote,
  submitMotmVote,
  type MotmMatch,
  type MotmPlayer,
  type MotmStanding,
  type RankingRow,
  type UserVoteRow,
} from "@/src/lib/motm";

import LiveStandings from "@/components/motm/LiveStandings";
import PlayerVoteGrid from "@/components/motm/PlayerVoteGrid";
import VoteSummary from "@/components/motm/VoteSummary";
import type { VotePlayer } from "@/components/motm/PlayerVoteCard";

export default function ManVanDeWedstrijdPage() {
  const params = useParams();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<MotmMatch | null>(null);
  const [players, setPlayers] = useState<MotmPlayer[]>([]);
  const [standings, setStandings] = useState<MotmStanding[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isVotingClosed = useMemo(() => {
    if (!match) return false;

    const deadline =
      new Date(match.kickoff).getTime() + 24 * 60 * 60 * 1000;

    return Date.now() >= deadline;
  }, [match]);

  const canSeeStandings = hasVoted || isVotingClosed;

  const loadStandings = useCallback(
    async (playersToUse: MotmPlayer[]) => {
      if (!Number.isInteger(matchId) || matchId <= 0) {
        return;
      }

      setStandingsLoading(true);

      const { data, error } = await getMatchRankingRows(matchId);

      if (error) {
        console.error("Tussenstand ophalen mislukt:", error);

        setErrorMessage(
          `De tussenstand kon niet worden geladen: ${error.message}`,
        );

        setStandingsLoading(false);
        return;
      }

      const rankingRows = (data ?? []) as RankingRow[];

      setStandings(
        buildMotmStandings(playersToUse, rankingRows),
      );

      setStandingsLoading(false);
    },
    [matchId],
  );

  useEffect(() => {
    async function loadPageData() {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

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
        getMotmMatch(matchId),
        getActiveMotmPlayers(),
        getUserMotmVote(matchId, userData.user.id),
      ]);

      if (matchError || playerError || existingVoteError) {
        const error =
          matchError ?? playerError ?? existingVoteError;

        console.error("Pagina laden mislukt:", {
          matchError,
          playerError,
          existingVoteError,
        });

        setErrorMessage(
          error?.message || "De pagina kon niet worden geladen.",
        );
        setLoading(false);
        return;
      }

      if (!matchData) {
        setErrorMessage("Deze wedstrijd werd niet gevonden.");
        setLoading(false);
        return;
      }

      const loadedPlayers = (playerData ?? []) as MotmPlayer[];
      const existingVote = (
        (existingVoteData ?? []) as UserVoteRow[]
      )
        .sort((a, b) => a.rank - b.rank)
        .map((vote) => vote.player_id);

      const userHasVoted = existingVote.length === 3;
      const deadline =
        new Date(matchData.kickoff).getTime() +
        24 * 60 * 60 * 1000;
      const votingClosed = Date.now() >= deadline;

      setMatch(matchData as MotmMatch);
      setPlayers(loadedPlayers);
      setSelectedPlayerIds(existingVote);
      setHasVoted(userHasVoted);
      setLoading(false);

      if (userHasVoted || votingClosed) {
        await loadStandings(loadedPlayers);
      }
    }

    void loadPageData();
  }, [loadStandings, matchId]);

  async function handleSubmitVote() {
    if (submitting) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (selectedPlayerIds.length !== 3) {
      setErrorMessage("Kies precies drie verschillende spelers.");
      return;
    }

    if (new Set(selectedPlayerIds).size !== 3) {
      setErrorMessage("Kies drie verschillende spelers.");
      return;
    }

    setSubmitting(true);

    const { error } = await submitMotmVote(
      matchId,
      selectedPlayerIds,
    );

    if (error) {
      console.error("Stem opslaan mislukt:", error);
      setErrorMessage(error.message);
      setSubmitting(false);
      return;
    }

    setHasVoted(true);
    setSuccessMessage(
      "Je Top 3 werd succesvol opgeslagen. Je kunt je keuze tot de deadline nog wijzigen.",
    );

    await loadStandings(players);

    setSubmitting(false);
  }

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
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
            <p className="font-bold text-red-200">
              {errorMessage}
            </p>
          </div>
        )}

        {!loading && successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
            <p className="font-bold text-emerald-200">
              {successMessage}
            </p>
          </div>
        )}

        {!loading && players.length === 0 && (
          <div className="ucl-card-dark mt-10 p-6">
            <p className="font-bold text-white/60">
              Er zijn momenteel geen actieve spelers.
            </p>
          </div>
        )}

        {!loading && match && players.length > 0 && (
          <div className="mt-10 space-y-8">
            <VoteSummary
              players={players as VotePlayer[]}
              selectedPlayerIds={selectedPlayerIds}
              onSubmit={handleSubmitVote}
            />

            {submitting && (
              <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-5">
                <p className="font-bold text-sky-200">
                  Je stem wordt opgeslagen...
                </p>
              </div>
            )}

            {canSeeStandings ? (
              standingsLoading ? (
                <div className="ucl-card-dark p-6">
                  <p className="font-bold text-white/60">
                    De tussenstand wordt geladen...
                  </p>
                </div>
              ) : (
                <LiveStandings
                  standings={standings}
                  isFinal={isVotingClosed}
                />
              )
            ) : (
              <div className="ucl-card-dark p-6">
                <p className="font-black text-white">
                  De tussenstand is nog verborgen
                </p>

                <p className="mt-2 font-semibold text-white/50">
                  Breng eerst je Top 3 uit. Daarna zie je meteen
                  de live tussenstand.
                </p>
              </div>
            )}

            <PlayerVoteGrid
              players={players as VotePlayer[]}
              selectedPlayerIds={selectedPlayerIds}
              onChange={(playerIds) => {
                setSelectedPlayerIds(playerIds);
                setErrorMessage("");
                setSuccessMessage("");
              }}
            />
          </div>
        )}
      </div>
    </main>
  );
}