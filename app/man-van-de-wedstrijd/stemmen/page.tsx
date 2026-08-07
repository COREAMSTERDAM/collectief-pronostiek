"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
};

type UserVoteRow = {
  match_id: number;
};

type MatchWithVoteStatus = Match & {
  hasVoted: boolean;
};

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

export default function StemmenPage() {
  const [matches, setMatches] = useState<MatchWithVoteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMatches = useCallback(async () => {
    try {
      setErrorMessage("");

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        window.location.href = "/login?reason=login-required";
        return;
      }

      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff, status")
        .order("kickoff", { ascending: true });

      if (matchError) {
        throw matchError;
      }

      const now = Date.now();

      const openMatches = ((matchData ?? []) as Match[]).filter((match) => {
        const deadline = getVotingDeadline(match.kickoff);
        return Number.isFinite(deadline) && deadline > now;
      });

      if (openMatches.length === 0) {
        setMatches([]);
        return;
      }

      const matchIds = openMatches.map((match) => match.id);

      const { data: voteData, error: voteError } = await supabase
        .from("player_rankings")
        .select("match_id")
        .eq("user_id", userData.user.id)
        .in("match_id", matchIds);

      if (voteError) {
        throw voteError;
      }

      const voteCounts = new Map<number, number>();

      for (const vote of (voteData ?? []) as UserVoteRow[]) {
        voteCounts.set(
          vote.match_id,
          (voteCounts.get(vote.match_id) ?? 0) + 1,
        );
      }

      setMatches(
        openMatches.map((match) => ({
          ...match,
          hasVoted: (voteCounts.get(match.id) ?? 0) === 3,
        })),
      );
    } catch (error) {
      console.error("Fout bij laden van wedstrijden:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De wedstrijden konden niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();

    const matchesChannel = supabase
      .channel("motm-open-matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
        },
        () => {
          void loadMatches();
        },
      )
      .subscribe();

    const votesChannel = supabase
      .channel("motm-user-votes-overview")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_rankings",
        },
        () => {
          void loadMatches();
        },
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      void loadMatches();
    }, 60_000);

    return () => {
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(matchesChannel);
      void supabase.removeChannel(votesChannel);
    };
  }, [loadMatches]);

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card text-center">
          <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
            🟣 Man van de wedstrijd
          </span>

          <img
            src="/logo.png"
            alt="Logo Collectief Pronostiek"
            className="ucl-logo mt-5"
          />

          <h1 className="ucl-title">Stemmen</h1>

          <p className="ucl-subtitle">
            Kies een wedstrijd en stel jouw persoonlijke Top 3 samen.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          {loading && (
            <div className="ucl-card text-center">
              <p className="ucl-subtitle">Wedstrijden laden...</p>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="ucl-card text-center">
              <p className="font-semibold text-red-300">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={() => void loadMatches()}
                className="ucl-button-secondary mt-4"
              >
                Opnieuw proberen
              </button>
            </div>
          )}

          {!loading && !errorMessage && matches.length === 0 && (
            <div className="ucl-card text-center">
              <p className="text-lg font-bold text-white">
                Geen open stemmingen
              </p>

              <p className="ucl-subtitle mt-2">
                Zodra een wedstrijd beschikbaar is, verschijnt die hier
                automatisch.
              </p>
            </div>
          )}

          {!loading &&
            !errorMessage &&
            matches.map((match) => (
              <article key={match.id} className="ucl-card">
                <div className="text-center">
                  <div className="flex justify-center">
                    {match.hasVoted ? (
                      <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
                        ✅ Gestemd
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
                        🟢 Stemming open
                      </span>
                    )}
                  </div>

                  <div className="mt-5 rounded-3xl border border-emerald-400/15 bg-emerald-500/[0.06] p-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200/70">
                      ⚽ Wedstrijd
                    </p>

                    <h2 className="mt-4 text-2xl font-black text-white">
                      {match.home_team}
                    </h2>

                    <p className="my-2 text-sm font-black uppercase tracking-[0.25em] text-emerald-300">
                      VS
                    </p>

                    <h2 className="text-2xl font-black text-white">
                      {match.away_team}
                    </h2>
                  </div>

                  <p className="mt-5 text-sm font-semibold capitalize text-white/70">
                    🕒 Aftrap: {formatDate(match.kickoff)}
                  </p>

                  <p className="mt-2 text-xs font-bold capitalize text-white/45">
                    Stemmen mogelijk tot{" "}
                    {formatDate(getVotingDeadline(match.kickoff))}
                  </p>
                </div>

                <Link
                  href={`/man-van-de-wedstrijd/${match.id}`}
                  className={
                    match.hasVoted
                      ? "ucl-button-secondary mt-5"
                      : "ucl-button-primary mt-5"
                  }
                >
                  {match.hasVoted
                    ? "✏️ Stem bekijken of wijzigen"
                    : "🗳️ Stem nu"}
                </Link>
              </article>
            ))}
        </section>

        <div className="mt-6 space-y-4">
          <Link
            href="/motmpagina"
            className="ucl-button-secondary"
          >
            ⬅️ Terug naar Man van de wedstrijd
          </Link>

          <Link href="/" className="ucl-button-secondary">
            🏠 Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
