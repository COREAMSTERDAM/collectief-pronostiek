"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getPlayerRatingHistoryDetail,
  type PlayerRatingHistoryDetail,
} from "@/src/lib/player-rating-history";

function formatScore(value: number | null) {
  return value === null ? "—" : value.toFixed(2).replace(".", ",");
}

export default function PlayerHistoryDetailPage() {
  const params = useParams<{ playerId: string }>();
  const playerId = Number(params.playerId);

  const [detail, setDetail] =
    useState<PlayerRatingHistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadPage() {
      try {
        if (!Number.isInteger(playerId) || playerId <= 0) {
          throw new Error("Ongeldige speler.");
        }

        const teams = await getActiveCoachTeams();
        const team = teams[0];

        if (!team) {
          throw new Error("Er is geen actief coachteam ingesteld.");
        }

        const result = await getPlayerRatingHistoryDetail(
          team.id,
          playerId,
        );

        if (mounted) setDetail(result);
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "De spelershistoriek kon niet worden geladen.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [playerId]);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-4xl">
        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <section className="ucl-card text-center">
            <p className="ucl-subtitle">Speler laden…</p>
          </section>
        ) : detail?.player ? (
          <>
            <header className="ucl-card text-center">
              <h1 className="ucl-title">{detail.player.player_name}</h1>
              <p className="ucl-subtitle">
                {detail.player.registered_position ?? "Geen positie"}
              </p>
            </header>

            <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <article className="ucl-card text-center">
                <p className="text-xs font-black uppercase text-white/35">
                  Gemiddelde
                </p>
                <p className="mt-2 text-3xl font-black text-amber-200">
                  {formatScore(detail.summary.overall_average)}
                </p>
              </article>

              <article className="ucl-card text-center">
                <p className="text-xs font-black uppercase text-white/35">
                  Hoogste
                </p>
                <p className="mt-2 text-3xl font-black">
                  {formatScore(detail.summary.highest_rating)}
                </p>
              </article>

              <article className="ucl-card text-center">
                <p className="text-xs font-black uppercase text-white/35">
                  Laagste
                </p>
                <p className="mt-2 text-3xl font-black">
                  {formatScore(detail.summary.lowest_rating)}
                </p>
              </article>

              <article className="ucl-card text-center">
                <p className="text-xs font-black uppercase text-white/35">
                  Wedstrijden
                </p>
                <p className="mt-2 text-3xl font-black">
                  {detail.summary.finished_matches}
                </p>
              </article>
            </section>

            <section className="ucl-card mt-6">
              <h2 className="text-2xl font-black">Wedstrijdhistoriek</h2>

              <div className="mt-5 space-y-3">
                {detail.matches.map((match) => (
                  <article
                    key={match.match_id}
                    className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black">
                        {match.home_team} – {match.away_team}
                      </p>
                      <p className="mt-1 text-xs text-white/40">
                        {match.rating_count} stemmen
                      </p>
                    </div>

                    <p className="text-2xl font-black text-amber-200">
                      {formatScore(match.average_rating)}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        <div className="mt-8">
          <Link
            href="/iedereen-coach/spelershistoriek"
            className="ucl-button-secondary"
          >
            ← Terug naar spelershistoriek
          </Link>
        </div>
      </div>
    </main>
  );
}
