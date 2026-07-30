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

export default function StemmenPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMatches = useCallback(async () => {
    try {
      setErrorMessage("");

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("matches")
        .select("id, home_team, away_team, kickoff, status")
        .gt("kickoff", now)
        .order("kickoff", { ascending: true });

      if (error) {
        throw error;
      }

      setMatches(data ?? []);
    } catch (error) {
      console.error("Fout bij laden van wedstrijden:", error);

      setErrorMessage(
        "De wedstrijden konden niet worden geladen. Probeer het later opnieuw.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();

    const channel = supabase
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

    const refreshInterval = window.setInterval(() => {
      void loadMatches();
    }, 60_000);

    return () => {
      window.clearInterval(refreshInterval);
      void supabase.removeChannel(channel);
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
            <h1 className="ucl-title">Stemmen</h1>

            <p className="ucl-subtitle">
              Kies een wedstrijd en stel jouw top 3 spelers samen.
            </p>
          </div>
        </section>

        <section className="mt-6 space-y-4">
          {loading && (
            <div className="ucl-card text-center">
              <p className="ucl-subtitle">Wedstrijden laden...</p>
            </div>
          )}

          {!loading && errorMessage && (
            <div className="ucl-card text-center">
              <p className="font-semibold text-red-300">{errorMessage}</p>

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
                Geen wedstrijden beschikbaar
              </p>

              <p className="ucl-subtitle mt-2">
                Zodra er een nieuwe wedstrijd wordt toegevoegd, verschijnt die
                hier automatisch.
              </p>
            </div>
          )}

          {!loading &&
            !errorMessage &&
            matches.map((match) => (
              <article key={match.id} className="ucl-card">
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
                    Komende wedstrijd
                  </p>

                  <h2 className="mt-3 text-xl font-black text-white">
                    {match.home_team}
                  </h2>

                  <p className="my-1 font-bold text-white/50">tegen</p>

                  <h2 className="text-xl font-black text-white">
                    {match.away_team}
                  </h2>

                  <p className="mt-4 text-sm font-semibold capitalize text-white/70">
                    {formatKickoff(match.kickoff)}
                  </p>
                </div>

                <Link
                  href={`/man-van-de-wedstrijd/${match.id}`}
                  className="ucl-button-primary mt-5"
                >
                  🗳️ Stem nu
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