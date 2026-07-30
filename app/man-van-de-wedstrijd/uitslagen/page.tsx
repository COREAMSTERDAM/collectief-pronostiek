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

      setMatches(
        ((data ?? []) as Match[]).filter((match) => {
          const deadline = getVotingDeadline(match.kickoff);
          return Number.isFinite(deadline) && deadline <= now;
        }),
      );
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

    const refreshInterval = window.setInterval(() => {
      void loadMatches();
    }, 60_000);

    return () => {
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(matchesChannel);
    };
  }, [loadMatches]);

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card text-center">
          <span className="inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-purple-200">
            🟣 Man van de wedstrijd
          </span>

          <img
            src="/logo.png"
            alt="Logo Collectief Pronostiek"
            className="ucl-logo mt-5"
          />

          <h1 className="ucl-title">Uitslagen</h1>

          <p className="ucl-subtitle">
            Bekijk de definitieve rangschikking van afgesloten stemmingen.
          </p>
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
                  <span className="inline-flex rounded-full border border-slate-400/30 bg-slate-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-slate-200">
                    🔒 Stemming afgesloten
                  </span>

                  <div className="mt-5 rounded-3xl border border-purple-400/15 bg-purple-500/[0.06] p-6">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-purple-200/70">
                      ⚽ Wedstrijd
                    </p>

                    <h2 className="mt-4 text-2xl font-black text-white">
                      {match.home_team}
                    </h2>

                    <p className="my-2 text-sm font-black uppercase tracking-[0.25em] text-purple-300">
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
                    Stemperiode gesloten op{" "}
                    {formatDate(getVotingDeadline(match.kickoff))}
                  </p>
                </div>

                <Link
                  href={`/man-van-de-wedstrijd/${match.id}`}
                  className="ucl-button-secondary mt-5"
                >
                  📊 Bekijk definitieve uitslag
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
