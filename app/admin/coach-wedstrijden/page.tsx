"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import RatingMatchCard from "@/components/coach/admin/RatingMatchCard";
import {
  ensureCoachAdmin,
  getRatingAdminMatches,
  type RatingAdminMatch,
} from "@/src/lib/coach-rating-admin";

export default function CoachRatingAdminOverviewPage() {
  const [matches, setMatches] = useState<RatingAdminMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      await ensureCoachAdmin();
      const result = await getRatingAdminMatches();

      setMatches(result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De adminpagina kon niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
            Iedereen Coach Admin
          </p>

          <h1 className="ucl-title mt-3">
            Spelersbeoordelingen
          </h1>

          <p className="ucl-subtitle max-w-2xl">
            Duid per wedstrijd aan welke spelers beoordeeld mogen worden,
            beheer de deadline en finaliseer de gemiddelde cijfers.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">
              Wedstrijden laden…
            </p>
          </div>
        ) : matches.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <h2 className="text-xl font-black">
              Geen wedstrijden beschikbaar
            </h2>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {matches.map((match) => (
              <RatingMatchCard key={match.id} match={match} />
            ))}
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/admin-keuze" className="ucl-button-secondary">
            ← Terug naar admin
          </Link>

          <Link href="/" className="ucl-button-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
