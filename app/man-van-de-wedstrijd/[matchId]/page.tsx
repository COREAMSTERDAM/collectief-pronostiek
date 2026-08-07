"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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

const VOTING_DURATION_MS = 24 * 60 * 60 * 1000;

function getVotingDeadline(kickoff: string) {
  return new Date(kickoff).getTime() + VOTING_DURATION_MS;
}

function formatDate(value: string | number) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ManVanDeWedstrijdPage() {
  const router = useRouter();
  const params = useParams<{ matchId: string }>();
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
  const [now, setNow] = useState(() => Date.now());

  const votingDeadline = useMemo(() => {
    if (!match) return null;
    return getVotingDeadline(match.kickoff);
  }, [match]);

  const isVotingClosed =
    votingDeadline !== null && now >= votingDeadline;

  const canSeeStandings = hasVoted || isVotingClosed;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

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

      setStandings(
        buildMotmStandings(
          playersToUse,
          (data ?? []) as RankingRow[],
        ),
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
      const votingClosed =
        Date.now() >= getVotingDeadline(matchData.kickoff);

      setMatch(matchData as MotmMatch);
      setPlayers(loadedPlayers);
      setSelectedPlayerIds(existingVote);
      setHasVoted(userHasVoted);
      setNow(Date.now());
      setLoading(false);

      if (userHasVoted || votingClosed) {
        await loadStandings(loadedPlayers);
      }
    }

    void loadPageData();
  }, [loadStandings, matchId]);

  useEffect(() => {
    if (!canSeeStandings || players.length === 0) {
      return;
    }

    const channel = supabase
      .channel(`motm-ranking-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_rankings",
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          void loadStandings(players);
        },
      )
      .subscribe();

    const fallbackInterval = window.setInterval(() => {
      void loadStandings(players);
    }, 30_000);

    return () => {
      window.clearInterval(fallbackInterval);
      void supabase.removeChannel(channel);
    };
  }, [canSeeStandings, loadStandings, matchId, players]);

  useEffect(() => {
    if (
      isVotingClosed &&
      players.length > 0 &&
      standings.length === 0 &&
      !standingsLoading
    ) {
      void loadStandings(players);
    }
  }, [
    isVotingClosed,
    loadStandings,
    players,
    standings.length,
    standingsLoading,
  ]);

  async function handleSubmitVote() {
    if (submitting) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (isVotingClosed) {
      setErrorMessage(
        "De stemperiode is afgelopen. Je stem kan niet meer worden aangepast.",
      );
      return;
    }

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
      "Je Top 3 werd succesvol opgeslagen. Je keert zo terug naar het overzicht.",
    );

    await loadStandings(players);

    setSubmitting(false);

    window.setTimeout(() => {
      router.push("/man-van-de-wedstrijd/stemmen");
    }, 1500);
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card text-center">
          <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
            🟣 Man van de wedstrijd
          </span>

          <h1 className="ucl-title mt-4">
            {isVotingClosed ? "Definitieve uitslag" : "Breng je stem uit"}
          </h1>

          {match && (
            <>
              <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                  ⚽ Wedstrijd
                </p>

                <p className="mt-4 text-2xl font-black text-white md:text-3xl">
                  {match.home_team}
                </p>

                <p className="my-2 text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
                  VS
                </p>

                <p className="text-2xl font-black text-white md:text-3xl">
                  {match.away_team}
                </p>

                <p className="mt-5 font-bold capitalize text-white/60">
                  🕒 {formatDate(match.kickoff)}
                </p>
              </div>

              <div className="mt-5">
                {isVotingClosed ? (
                  <span className="inline-flex rounded-full border border-slate-400/30 bg-slate-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-slate-200">
                    🔒 Stemming afgesloten
                  </span>
                ) : hasVoted ? (
                  <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
                    ✅ Je hebt gestemd
                  </span>
                ) : (
                  <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
                    🟢 Stemming open
                  </span>
                )}
              </div>

              {votingDeadline !== null && (
                <p className="mt-3 text-sm font-semibold capitalize text-white/45">
                  {isVotingClosed
                    ? `Gesloten op ${formatDate(votingDeadline)}`
                    : `Stemmen mogelijk tot ${formatDate(votingDeadline)}`}
                </p>
              )}
            </>
          )}
        </section>

        {loading && (
          <div className="ucl-card-dark mt-6 p-6">
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
          <div className="ucl-card-dark mt-6 p-6">
            <p className="font-bold text-white/60">
              Er zijn momenteel geen actieve spelers.
            </p>
          </div>
        )}

        {!loading && match && players.length > 0 && (
          <div className="mt-8 space-y-8">
            {!isVotingClosed && (
              <>
                <VoteSummary
                  players={players as VotePlayer[]}
                  selectedPlayerIds={selectedPlayerIds}
                  onSubmit={handleSubmitVote}
                />

                {submitting && (
                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5">
                    <p className="font-bold text-emerald-100">
                      Je stem wordt opgeslagen...
                    </p>
                  </div>
                )}
              </>
            )}

            {isVotingClosed && (
              <div className="rounded-2xl border border-slate-400/20 bg-slate-500/10 p-5">
                <p className="font-black text-white">
                  🔒 De stemperiode is afgesloten
                </p>

                <p className="mt-2 font-semibold text-white/55">
                  De spelerskeuze kan niet meer worden gewijzigd. Hieronder zie
                  je de definitieve rangschikking.
                </p>
              </div>
            )}

            {canSeeStandings ? (
              standingsLoading && standings.length === 0 ? (
                <div className="ucl-card-dark p-6">
                  <p className="font-bold text-white/60">
                    De rangschikking wordt geladen...
                  </p>
                </div>
              ) : (
                <LiveStandings
                  standings={standings}
                  selectedPlayerIds={selectedPlayerIds}
                  isFinal={isVotingClosed}
                  isRefreshing={standingsLoading}
                  onRefresh={() => {
                    void loadStandings(players);
                  }}
                />
              )
            ) : (
              <div className="ucl-card-dark p-6">
                <p className="font-black text-white">
                  De tussenstand is nog verborgen
                </p>

                <p className="mt-2 font-semibold text-white/50">
                  Breng eerst je Top 3 uit. Daarna zie je meteen de live
                  tussenstand.
                </p>
              </div>
            )}

            {!isVotingClosed && (
              <PlayerVoteGrid
                players={players as VotePlayer[]}
                selectedPlayerIds={selectedPlayerIds}
                onChange={(playerIds) => {
                  setSelectedPlayerIds(playerIds);
                  setErrorMessage("");
                  setSuccessMessage("");
                }}
              />
            )}
          </div>
        )}

        <div className="mt-8 space-y-4">
          <Link
            href={
              isVotingClosed
                ? "/man-van-de-wedstrijd/uitslagen"
                : "/man-van-de-wedstrijd/stemmen"
            }
            className="ucl-button-secondary"
          >
            ⬅️ Terug naar {isVotingClosed ? "uitslagen" : "stemmen"}
          </Link>

          <Link
            href="/man-van-de-wedstrijd"
            className="ucl-button-secondary"
          >
            🟣 Man van de wedstrijd
          </Link>

          <Link href="/" className="ucl-button-secondary">
            🏠 Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
