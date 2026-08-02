"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import OpenRatingMatchCard from "@/components/coach/OpenRatingMatchCard";
import { getOpenMatchRatings, type OpenRatingMatch } from "@/src/lib/open-match-ratings";

export default function OpenMatchRatingsPage() {
  const [matches, setMatches] = useState<OpenRatingMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadMatches() {
      try {
        setLoading(true);
        setErrorMessage("");
        const result = await getOpenMatchRatings();
        if (mounted) setMatches(result);
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : "De open spelersbeoordelingen konden niet worden geladen.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadMatches();
    return () => { mounted = false; };
  }, []);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">Iedereen Coach</p>
          <h1 className="ucl-title mt-3">Spelers beoordelen</h1>
          <p className="ucl-subtitle mx-auto max-w-2xl">Kies een wedstrijd waarvoor de beoordelingsperiode momenteel open is.</p>
        </header>

        {errorMessage ? <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">{errorMessage}</div> : null}

        {loading ? (
          <section className="ucl-card mt-6 text-center"><p className="ucl-subtitle">Open spelersbeoordelingen laden…</p></section>
        ) : matches.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <div className="text-4xl">⭐</div>
            <h2 className="mt-4 text-xl font-black text-white">Geen open spelersbeoordelingen</h2>
            <p className="ucl-subtitle">Er zijn momenteel geen wedstrijden waarvoor je spelers kunt beoordelen.</p>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {matches.map((match) => <OpenRatingMatchCard key={match.match_id} match={match} />)}
          </section>
        )}

        <div className="mt-8">
          <Link href="/iedereencoachkeuze" className="ucl-button-secondary">← Terug naar Iedereen Coach</Link>
        </div>
      </div>
    </main>
  );
}
