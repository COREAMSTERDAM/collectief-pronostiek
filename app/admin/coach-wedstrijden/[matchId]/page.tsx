"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ensureCoachAdmin,
  finalizeMatchRatings,
  getRatingAdminMatches,
  getRatingAdminPlayers,
  saveMatchRatingDeadline,
  saveMatchRatingPlayers,
  type RatingAdminMatch,
  type RatingAdminPlayer,
} from "@/src/lib/coach-rating-admin";

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000)
    .toISOString()
    .slice(0, 16);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CoachRatingAdminMatchPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = Number(params.matchId);

  const [match, setMatch] = useState<RatingAdminMatch | null>(null);
  const [players, setPlayers] = useState<RatingAdminPlayer[]>([]);
  const [deadlineValue, setDeadlineValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeCount = useMemo(
    () => players.filter((player) => player.was_active).length,
    [players],
  );

  const startedCount = useMemo(
    () =>
      players.filter(
        (player) => player.was_active && player.started_match,
      ).length,
    [players],
  );

  const loadPage = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (!Number.isInteger(matchId) || matchId <= 0) {
        throw new Error("Ongeldige wedstrijd.");
      }

      await ensureCoachAdmin();

      const [matches, playerResult] = await Promise.all([
        getRatingAdminMatches(),
        getRatingAdminPlayers(matchId),
      ]);

      const selectedMatch =
        matches.find((item) => item.id === matchId) ?? null;

      if (!selectedMatch) {
        throw new Error("Deze wedstrijd werd niet gevonden.");
      }

      setMatch(selectedMatch);
      setPlayers(playerResult);
      setDeadlineValue(
        toDateTimeLocal(selectedMatch.rating_deadline),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De wedstrijd kon niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  function updatePlayer(
    playerId: number,
    changes: Partial<RatingAdminPlayer>,
  ) {
    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              ...changes,
              started_match:
                changes.was_active === false
                  ? false
                  : changes.started_match ?? player.started_match,
              minutes_played:
                changes.was_active === false
                  ? null
                  : changes.minutes_played ?? player.minutes_played,
            }
          : player,
      ),
    );
    setSuccessMessage("");
  }

  async function handleSave() {
    if (!match || saving || finalizing) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setSuccessMessage("");

      const parsedDeadline = deadlineValue
        ? new Date(deadlineValue).toISOString()
        : null;

      await Promise.all([
        saveMatchRatingPlayers({
          matchId: match.id,
          players,
        }),
        saveMatchRatingDeadline({
          matchId: match.id,
          ratingDeadline: parsedDeadline,
        }),
      ]);

      setSuccessMessage(
        `✅ ${activeCount} actieve spelers en de deadline werden opgeslagen.`,
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De instellingen konden niet worden opgeslagen.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (!match || finalizing || saving) return;

    const confirmed = window.confirm(
      "Wil je deze wedstrijd definitief afsluiten? De gemiddelden en coachscores worden berekend en supporters kunnen daarna niet meer stemmen.",
    );

    if (!confirmed) return;

    try {
      setFinalizing(true);
      setErrorMessage("");
      setSuccessMessage("");

      const result = await finalizeMatchRatings(match.id);

      setSuccessMessage(
        `✅ Wedstrijd gefinaliseerd: ${result.finalized_player_count} spelersgemiddelden en ${result.calculated_score_count} coachscores berekend.`,
      );

      await loadPage();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De wedstrijd kon niet worden gefinaliseerd.",
      );
    } finally {
      setFinalizing(false);
    }
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container !max-w-6xl">
          <section className="ucl-card text-center">
            <p className="ucl-subtitle">
              Wedstrijdinstellingen laden…
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        {errorMessage ? (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        {match ? (
          <>
            <header className="ucl-card">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
                Iedereen Coach Admin
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                {match.home_team}
                <span className="mx-3 text-amber-200/60">
                  VS
                </span>
                {match.away_team}
              </h1>

              <p className="ucl-subtitle">
                Aftrap: {formatDate(match.kickoff)}
              </p>
            </header>

            <section className="ucl-card mt-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                <div>
                  <label
                    htmlFor="rating-deadline"
                    className="text-sm font-black text-white"
                  >
                    Beoordelingsdeadline
                  </label>

                  <p className="ucl-muted">
                    Standaard is dit 48 uur na de aftrap.
                  </p>

                  <input
                    id="rating-deadline"
                    type="datetime-local"
                    value={deadlineValue}
                    disabled={match.finalized_at !== null}
                    onChange={(event) =>
                      setDeadlineValue(event.target.value)
                    }
                    className="ucl-input mt-3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                    <p className="text-xs font-black uppercase text-white/35">
                      Actief
                    </p>
                    <p className="mt-1 text-3xl font-black">
                      {activeCount}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
                    <p className="text-xs font-black uppercase text-white/35">
                      Basis
                    </p>
                    <p className="mt-1 text-3xl font-black">
                      {startedCount}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="ucl-card mt-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                  Wedstrijdselectie
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Actieve spelers
                </h2>

                <p className="ucl-subtitle">
                  Alleen spelers met “Actief” verschijnen later op de
                  beoordelingspagina voor supporters.
                </p>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                {players.map((player) => (
                  <article
                    key={player.id}
                    className={`rounded-2xl border p-4 ${
                      player.was_active
                        ? "border-amber-300/25 bg-amber-300/[0.07]"
                        : "border-white/10 bg-black/20"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-xs font-black">
                        {player.photo_url ? (
                          <img
                            src={player.photo_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          player.name
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">
                          {player.name}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-white/40">
                          {player.shirt_number !== null
                            ? `Nr. ${player.shirt_number}`
                            : "Geen rugnummer"}
                          {" · "}
                          {player.position ?? "Geen positie"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={player.was_active}
                          disabled={match.finalized_at !== null}
                          onChange={(event) =>
                            updatePlayer(player.id, {
                              was_active: event.target.checked,
                            })
                          }
                        />
                        Actief
                      </label>

                      <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold">
                        <input
                          type="checkbox"
                          checked={player.started_match}
                          disabled={
                            !player.was_active ||
                            match.finalized_at !== null
                          }
                          onChange={(event) =>
                            updatePlayer(player.id, {
                              started_match: event.target.checked,
                            })
                          }
                        />
                        Basis
                      </label>

                      <label className="block">
                        <span className="mb-1 block text-xs font-black uppercase text-white/35">
                          Minuten
                        </span>

                        <input
                          type="number"
                          min={0}
                          max={130}
                          value={player.minutes_played ?? ""}
                          disabled={
                            !player.was_active ||
                            match.finalized_at !== null
                          }
                          onChange={(event) =>
                            updatePlayer(player.id, {
                              minutes_played:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                          className="ucl-input !min-h-10 !py-2"
                        />
                      </label>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                disabled={
                  saving ||
                  finalizing ||
                  match.finalized_at !== null
                }
                onClick={() => {
                  void handleSave();
                }}
                className="ucl-button-primary !mt-0 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {saving
                  ? "Instellingen opslaan…"
                  : "💾 Instellingen opslaan"}
              </button>

              <button
                type="button"
                disabled={
                  saving ||
                  finalizing ||
                  match.finalized_at !== null
                }
                onClick={() => {
                  void handleFinalize();
                }}
                className="ucl-button-danger disabled:cursor-not-allowed disabled:opacity-35"
              >
                {finalizing
                  ? "Finaliseren…"
                  : match.finalized_at
                    ? "✓ Gefinaliseerd"
                    : "🔒 Gemiddelden finaliseren"}
              </button>
            </section>
          </>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/admin/coach-wedstrijden"
            className="ucl-button-secondary"
          >
            ← Terug naar wedstrijden
          </Link>

          <Link href="/admin-keuze" className="ucl-button-secondary">
            Adminmenu
          </Link>
        </div>
      </div>
    </main>
  );
}
