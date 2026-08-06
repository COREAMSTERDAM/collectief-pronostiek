"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveCoachTeams } from "@/src/lib/coach";
import {
  getMySeparateCoachScores,
  getSeparateCoachRanking,
  type MyCoachMatchScore,
  type SeparateCoachRanking,
  type SeparateCoachRankingRow,
} from "@/src/lib/separate-coach-ranking";

function formatPoints(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function SeparateCoachRankingPage() {
  const [ranking, setRanking] =
    useState<SeparateCoachRanking | null>(null);
  const [history, setHistory] = useState<MyCoachMatchScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [showScoringGuide, setShowScoringGuide] = useState(false);

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

        const [rankingResult, historyResult] = await Promise.all([
          getSeparateCoachRanking(team.id),
          getMySeparateCoachScores(team.id),
        ]);

        if (!mounted) return;

        setRanking(rankingResult);
        setHistory(historyResult);
      } catch (error) {
        if (!mounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Het coachklassement kon niet worden geladen.",
        );
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

  const rows = ranking?.ranking ?? [];
  const first = rows[0];
  const second = rows[1];
  const third = rows[2];

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">Coachklassement laden...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-7">
          <h1 className="ucl-title">
            Coachklassement
          </h1>

          <p className="ucl-subtitle">
            Bekijk wie momenteel aan kop staat in Iedereen Coach.
          </p>

          <div className="mt-5">
            <Link
              href="/iedereencoachkeuze"
              className="ucl-button-secondary"
            >
              ← Terug naar Iedereen Coach
            </Link>
          </div>
        </div>

        <section className="ucl-card mb-8">
          <button
            type="button"
            onClick={() => setShowScoringGuide((current) => !current)}
            aria-expanded={showScoringGuide}
            aria-controls="coach-puntensysteem-uitleg"
            className="flex w-full items-center justify-between gap-4 text-left"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-2xl">
                🧠
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-black text-white">
                  Puntensysteem
                </h2>

                <p className="ucl-muted">
                  Bekijk hoe je coachpunten per wedstrijd worden berekend.
                </p>
              </div>
            </div>

            <span
              className={`shrink-0 text-2xl font-black text-amber-300 transition-transform duration-200 ${
                showScoringGuide ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            >
              ⌄
            </span>
          </button>

          {showScoringGuide ? (
            <div
              id="coach-puntensysteem-uitleg"
              className="mt-6 border-t border-white/10 pt-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <p className="text-lg font-black text-white">
                    ⚽ Jouw selectie
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    We nemen de spelers uit je definitief ingediende
                    opstelling voor die wedstrijd.
                  </p>
                </div>

                <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                  <p className="text-lg font-black text-white">
                    ⭐ Gemiddelde spelersscores
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Alleen spelers met een definitief gemiddelde leveren
                    coachpunten op.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 sm:col-span-2">
                  <p className="text-lg font-black text-white">
                    🏆 Totaal coachklassement
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Per wedstrijd worden alle beschikbare gemiddelden uit je
                    selectie opgeteld. Alle wedstrijdscores samen vormen je
                    totaal in dit klassement.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {errorMessage ? (
          <div className="mb-8 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {rows.length > 0 ? (
          <section className="mb-8">
            <div className="flex items-end justify-center gap-3">
              {second ? (
                <CoachPodiumCard
                  player={second}
                  position={2}
                />
              ) : null}

              {first ? (
                <CoachPodiumCard
                  player={first}
                  position={1}
                />
              ) : null}

              {third ? (
                <CoachPodiumCard
                  player={third}
                  position={3}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-black text-white">
              Volledig coachklassement
            </h2>

            <p className="ucl-muted">
              Posities worden berekend op basis van het totale aantal
              coachpunten.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="ucl-card">
              <p className="ucl-muted">
                Nog geen coachscores beschikbaar.
              </p>
            </div>
          ) : (
            <div className="ucl-card overflow-hidden p-0">
              {rows.map((row, index) => (
                <Link
                  key={row.user_id}
                  href={`/profiel/${row.user_id}`}
                  aria-label={`Bekijk het profiel van ${row.coach_name}`}
                  className={`group grid grid-cols-[minmax(0,1fr)_5.5rem_1rem] items-center gap-2 border-b border-white/[0.075] px-3 py-3 transition last:border-b-0 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${
                    row.is_current_user
                      ? "ucl-ranking-current"
                      : ""
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 font-black text-white">
                      {index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : index === 2
                            ? "🥉"
                            : index + 1}
                    </div>

                    <CoachAvatar
                      name={row.coach_name}
                      avatarUrl={row.avatar_url}
                      position={index + 1}
                    />

                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-bold leading-tight text-white break-words">
                        {row.coach_name}

                        {row.is_current_user ? (
                          <span className="ml-2 text-sm font-bold text-emerald-300">
                            jij
                          </span>
                        ) : null}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        {row.scored_matches}{" "}
                        {row.scored_matches === 1
                          ? "wedstrijd"
                          : "wedstrijden"}
                      </p>
                    </div>
                  </div>

                  <div className="w-[6.5rem] justify-self-end text-right">
                    <p className="text-lg font-black leading-none tabular-nums text-white">
                      {formatPoints(row.total_points)}
                    </p>

                    <p className="text-[10px] uppercase tracking-wide text-white/35">
                      punten
                    </p>
                  </div>

                  <span
                    className="justify-self-end text-lg font-black text-slate-600 transition group-hover:translate-x-1 group-hover:text-amber-300"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="ucl-card mb-8">
          <h2 className="text-2xl font-black text-white">
            Mijn wedstrijdscores
          </h2>

          <p className="ucl-subtitle">
            Bekijk hoeveel coachpunten je per gefinaliseerde wedstrijd hebt
            verzameld.
          </p>

          {history.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-center">
              <p className="text-sm font-semibold text-white/45">
                Je hebt nog geen berekende coachscores.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {history.map((match) => (
                <article
                  key={match.match_id}
                  className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-black text-white">
                      {match.home_team} – {match.away_team}
                    </p>

                    <p className="mt-1 text-xs text-white/40">
                      {formatDate(match.kickoff)}
                      {" · "}
                      {match.scored_player_count} van{" "}
                      {match.selected_player_count} spelers hadden een
                      gemiddelde
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-black tabular-nums text-amber-200">
                      {formatPoints(match.score)}
                    </p>

                    <p className="text-[10px] font-black uppercase tracking-wide text-white/30">
                      punten
                    </p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/iedereencoachkeuze"
            className="ucl-button-secondary"
          >
            ← Terug naar Iedereen Coach
          </Link>

          <Link
            href="/klassement"
            className="ucl-button-secondary"
          >
            Gewoon pronostiekklassement
          </Link>
        </div>
      </div>
    </main>
  );
}

function CoachAvatar({
  name,
  avatarUrl,
  position,
  size = "md",
}: {
  name: string;
  avatarUrl: string | null;
  position?: number;
  size?: "md" | "lg";
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  const sizeClass =
    size === "lg"
      ? "h-10 w-10 text-sm"
      : "h-6 w-6 text-[10px]";

  const ringClass =
    position === 1
      ? "border-amber-300 ring-2 ring-amber-300/35"
      : position === 2
        ? "border-slate-200 ring-2 ring-slate-200/25"
        : position === 3
          ? "border-orange-400 ring-2 ring-orange-400/30"
          : "border-white/15";

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-gradient-to-br from-amber-500/25 to-orange-500/20 font-black text-white shadow-lg shadow-slate-950/20 ${sizeClass} ${ringClass}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Profielfoto van ${name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-label={`Initialen van ${name}`}>{initials}</span>
      )}
    </div>
  );
}

function CoachPodiumCard({
  player,
  position,
}: {
  player: SeparateCoachRankingRow;
  position: 1 | 2 | 3;
}) {
  const podiumHeight =
    position === 1
      ? "h-24"
      : position === 2
        ? "h-16"
        : "h-12";

  const podiumIcon =
    position === 1
      ? "🥇"
      : position === 2
        ? "🥈"
        : "🥉";

  const cardClass =
    position === 1
      ? "border-amber-300/35 bg-amber-400/10"
      : position === 2
        ? "border-slate-300/25 bg-slate-300/10"
        : "border-orange-400/25 bg-orange-400/10";

  const podiumClass =
    position === 1
      ? "border-amber-300/25 bg-gradient-to-b from-amber-400/30 to-amber-700/20 text-amber-100"
      : position === 2
        ? "border-slate-300/20 bg-gradient-to-b from-slate-300/20 to-slate-700/20 text-slate-100"
        : "border-orange-400/20 bg-gradient-to-b from-orange-400/20 to-orange-800/20 text-orange-100";

  return (
    <Link
      href={`/profiel/${player.user_id}`}
      aria-label={`Bekijk het profiel van ${player.coach_name}`}
      className={`w-1/3 rounded-2xl border p-3 text-center backdrop-blur-xl transition hover:-translate-y-1 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 ${cardClass} ${
        player.is_current_user
          ? "ring-1 ring-emerald-400/60"
          : ""
      }`}
    >
      <div className="mb-3 flex justify-center">
        <CoachAvatar
          name={player.coach_name}
          avatarUrl={player.avatar_url}
          position={position}
          size={position === 1 ? "lg" : "md"}
        />
      </div>

      <div className={position === 1 ? "mb-2 text-4xl" : "mb-2 text-3xl"}>
        {podiumIcon}
      </div>

      <p className="line-clamp-2 text-[0.72rem] font-bold leading-tight text-white break-words">
        {player.coach_name}
      </p>

      {player.is_current_user ? (
        <p className="mt-1 text-xs font-bold text-emerald-300">
          Jij
        </p>
      ) : null}

      <p className="mt-1 text-sm font-semibold text-slate-200">
        {formatPoints(player.total_points)} punten
      </p>

      <div
        className={`mt-3 flex items-center justify-center rounded-xl border font-black ${podiumHeight} ${podiumClass}`}
      >
        {position}
      </div>

      <p className="mt-2 text-xs font-bold text-amber-300">
        Bekijk profiel →
      </p>
    </Link>
  );
}