"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RatingArchiveMatchCard from "@/components/coach/RatingArchiveMatchCard";
import {
  getRatingArchive,
  type RatingArchiveMatch,
} from "@/src/lib/rating-archive";

export default function RatingArchivePage() {
  const [matches, setMatches] = useState<RatingArchiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadArchive() {
      try {
        setLoading(true);
        setErrorMessage("");

        const result = await getRatingArchive();

        if (mounted) {
          setMatches(result);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Het archief kon niet worden geladen.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadArchive();

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
            Archief spelersbeoordelingen
          </h1>

          <p className="ucl-subtitle mx-auto max-w-2xl">
            Bekijk per afgesloten wedstrijd de definitieve gemiddelde score
            van iedere speler.
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
              Archief laden…
            </p>
          </section>
        ) : matches.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <div className="text-4xl">📚</div>

            <h2 className="mt-4 text-xl font-black text-white">
              Nog geen afgesloten beoordelingen
            </h2>

            <p className="ucl-subtitle">
              Gefinaliseerde wedstrijden verschijnen hier automatisch.
            </p>
          </section>
        ) : (
          <section className="mt-6 space-y-6">
            {matches.map((match) => (
              <RatingArchiveMatchCard
                key={match.match_id}
                match={match}
              />
            ))}
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/iedereen-coach/beoordelen"
            className="ucl-button-secondary"
          >
            ← Open beoordelingen
          </Link>

          <Link
            href="/iedereencoachkeuze"
            className="ucl-button-secondary"
          >
            Iedereen Coach
          </Link>
        </div>
      </div>
    </main>
  );
}
