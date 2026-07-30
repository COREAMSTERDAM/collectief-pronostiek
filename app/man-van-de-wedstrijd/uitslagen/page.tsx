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

const VOTING_DURATION_MS = 24 * 60 * 60 * 1000;

function getVotingDeadline(kickoff: string) {
  return new Date(kickoff).getTime() + VOTING_DURATION_MS;
}

function formatKickoff(kickoff: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(kickoff));
}

function formatDeadline(kickoff: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(getVotingDeadline(kickoff)));
}

export default function UitslagenPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMatches = useCallback(async () => {
    try {
      setErrorMessage("");

      const { data, error } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff, status")
        .order("kickoff", { ascending: false });

      if (error) {
        throw error;
      }

      const now = Date.now();

      const finishedMatches = ((data ?? []) as Match[]).filter((match) => {
        const deadline = getVotingDeadline(match.kickoff);

        return Number.isFinite(deadline) && deadline <= now;
      });

      setMatches(finishedMatches);
    } catch (error) {
      console.error("Fout bij laden van uitslagen:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De wedstrijden konden niet worden geladen. Probeer het later opnieuw.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();

    const matchesChannel = supabase
      .channel("motm-finished-matches")
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

    const rankingsChannel = supabase
      .channel("motm-finished-rankings")
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
      void supabase.removeChannel(rankingsChannel);
    };
  }, [loadMatches]);

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card">
          <img
            src="/logo.png"
            alt="Logo Collectief Pronostiek"
            className="ucl-logo"
          />

          <div className="text-center">
            <h1 className="ucl-title">Uitslagen</h1>

            <p className="ucl-subtitle">
              Bekijk de definitieve stemming van wedstrijden waarvan de
              stemperiode is afgelopen.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {loading && (
            <div className="ucl-card text-center">
              <p className="ucl-subtitle">Uitslagen laden...</p>
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
                Nog geen uitslagen beschikbaar
              </p>

              <p className="ucl-subtitle mt-2">
                Een wedstrijd verschijnt hier automatisch zodra de stemperiode
                van 24 uur na de aftrap is afgelopen.
              </p>
            </div>
          )}

          {!loading &&
            !errorMessage &&
            matches.map((match) => (
              <article key={match.id} className="ucl-card">
                <div className="text-center">
                  <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-300">
                    ✅ Stemming afgelopen
                  </span>

                  <h2 className="mt-4 text-xl font-black text-white">
                    {match.home_team}
                  </h2>

                  <p className="my-1 font-bold text-white/50">
                    tegen
                  </p>

                  <h2 className="text-xl font-black text-white">
                    {match.away_team}
                  </h2>

                  <p className="mt-4 text-sm font-semibold capitalize text-white/70">
                    Aftrap: {formatKickoff(match.kickoff)}
                  </p>

                  <p className="mt-2 text-xs font-bold capitalize text-white/45">
                    Stemperiode gesloten op {formatDeadline(match.kickoff)}
                  </p>
                </div>

                <Link
                  href={`/man-van-de-wedstrijd/${match.id}`}
                  className="ucl-button-secondary mt-5"
                >
                  📊 Bekijk uitslag
                </Link>
              </article>
            ))}
        </section>

        <div className="mt-6 space-y-4">
          <Link
            href="/man-van-de-wedstrijd"
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