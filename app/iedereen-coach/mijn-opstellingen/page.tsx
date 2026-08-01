"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ClosedLineupCard from "@/components/coach/ClosedLineupCard";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getMyClosedLineups,
  type ClosedCoachLineup,
} from "@/src/lib/coach-lineup-history";

export default function MyClosedLineupsPage() {
  const [lineups, setLineups] = useState<ClosedCoachLineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        setLoading(true);
        setErrorMessage("");

        const teams = await getActiveCoachTeams();
        const team = teams[0];

        if (!team) {
          throw new Error("Er is geen actief coachteam ingesteld.");
        }

        const result = await getMyClosedLineups(team.id);

        if (mounted) {
          setLineups(result);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Je eerdere opstellingen konden niet worden geladen.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Iedereen Coach
          </p>

          <h1 className="ucl-title mt-3">
            Mijn eerdere opstellingen
          </h1>

          <p className="ucl-subtitle mx-auto max-w-2xl">
            Bekijk je bewaarde en definitief ingediende basiselftallen van
            wedstrijden waarvan de deadline verstreken is.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">
              Eerdere opstellingen laden…
            </p>
          </section>
        ) : lineups.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <h2 className="text-xl font-black text-white">
              Nog geen eerdere opstellingen
            </h2>

            <p className="ucl-subtitle">
              Zodra de deadline van een wedstrijd verstreken is, verschijnt
              jouw opgeslagen basiself hier automatisch.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {lineups.map((lineup) => (
              <ClosedLineupCard
                key={lineup.lineup_id}
                lineup={lineup}
              />
            ))}
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/iedereen-coach"
            className="ucl-button-secondary"
          >
            ← Terug naar open wedstrijden
          </Link>

          <Link
            href="/iedereen-coach/klassement"
            className="ucl-button-secondary"
          >
            Coachklassement
          </Link>
        </div>
      </div>
    </main>
  );
}
