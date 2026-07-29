"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
};

type PredictionRow = {
  id: number;
  pred_home: number;
  pred_away: number;
  points: number;
  user_id: string;
};

type Profile = {
  id: string;
  name: string;
};

type PredictionWithName = PredictionRow & {
  name: string;
};

export default function PronostiekenPage() {
  const params = useParams();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<Match | null>(null);
  const [predictions, setPredictions] = useState<PredictionWithName[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      if (!Number.isInteger(matchId)) {
        alert("Ongeldige wedstrijd.");
        window.location.href = "/wedstrijden";
        return;
      }

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        alert(userError.message);
        setLoading(false);
        return;
      }

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data: matchData, error: matchError } =
        await supabase
          .from("matches")
          .select(
            "id, home_team, away_team, kickoff, home_score, away_score"
          )
          .eq("id", matchId)
          .single();

      if (matchError) {
        alert(matchError.message);
        setLoading(false);
        return;
      }

      setMatch(matchData);

      const kickoffTime = new Date(matchData.kickoff).getTime();

      if (Date.now() < kickoffTime) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      const {
        data: predictionsData,
        error: predictionsError,
      } = await supabase
        .from("predictions")
        .select(
          "id, user_id, pred_home, pred_away, points"
        )
        .eq("match_id", matchId);

      if (predictionsError) {
        alert(predictionsError.message);
        setLoading(false);
        return;
      }

      const userIds =
        predictionsData?.map(
          (prediction) => prediction.user_id
        ) ?? [];

      let profilesData: Profile[] = [];

      if (userIds.length > 0) {
        const {
          data,
          error: profilesError,
        } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);

        if (profilesError) {
          alert(profilesError.message);
          setLoading(false);
          return;
        }

        profilesData = data ?? [];
      }

      const merged: PredictionWithName[] =
        predictionsData?.map((prediction) => {
          const profile = profilesData.find(
            (item) => item.id === prediction.user_id
          );

          return {
            ...prediction,
            name: profile?.name ?? "Onbekend",
          };
        }) ?? [];

      merged.sort((a, b) => {
        if (b.points !== a.points) {
          return b.points - a.points;
        }

        return a.name.localeCompare(b.name, "nl-BE");
      });

      setPredictions(merged);
      setLoading(false);
    }

    loadData();
  }, [matchId]);

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">
              Pronostieken laden...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <h1 className="ucl-title">
              Wedstrijd niet gevonden
            </h1>

            <p className="ucl-subtitle">
              Deze wedstrijd bestaat niet of is niet meer
              beschikbaar.
            </p>

            <a
              href="/wedstrijden"
              className="ucl-button-secondary mt-6"
            >
              Terug naar wedstrijden
            </a>
          </div>
        </div>
      </main>
    );
  }

  const isClosed =
    Date.now() >= new Date(match.kickoff).getTime();

  const hasResult =
    match.home_score !== null &&
    match.away_score !== null;

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-7">
          <h1 className="ucl-title">
            Pronostieken
          </h1>

          <p className="ucl-subtitle">
            Bekijk alle voorspellingen voor deze wedstrijd.
          </p>
        </div>

        <section className="ucl-card mb-6">
          <div className="text-center">
            <div className="ucl-status">
              <span>{isClosed ? "🔒" : "●"}</span>

              <span>
                {isClosed
                  ? "Pronostieken zichtbaar"
                  : "Nog verborgen"}
              </span>
            </div>

            <p className="mt-5 text-2xl font-black text-white">
              {match.home_team}
            </p>

            <p className="my-2 text-sm font-bold uppercase tracking-[0.3em] text-slate-500">
              tegen
            </p>

            <p className="text-2xl font-black text-white">
              {match.away_team}
            </p>

            <p className="ucl-muted mt-4">
              {new Date(match.kickoff).toLocaleString(
                "nl-BE",
                {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}
            </p>
          </div>

          {hasResult && (
            <div className="ucl-card-dark text-center">
              <p className="ucl-muted">
                Officiële uitslag
              </p>

              <p className="mt-1 text-4xl font-black text-white">
                {match.home_score} - {match.away_score}
              </p>
            </div>
          )}
        </section>

        {!isClosed ? (
          <section className="ucl-card">
            <div className="text-center">
              <div className="mb-3 text-4xl">
                🔒
              </div>

              <h2 className="text-xl font-black text-white">
                Pronostieken nog verborgen
              </h2>

              <p className="ucl-muted mt-2">
                De voorspellingen worden automatisch zichtbaar
                na de aftrap.
              </p>
            </div>
          </section>
        ) : predictions.length === 0 ? (
          <section className="ucl-card">
            <p className="ucl-muted">
              Nog geen pronostieken voor deze wedstrijd.
            </p>
          </section>
        ) : (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-black text-white">
                Alle pronostieken
              </h2>

              <p className="ucl-muted">
                {predictions.length}{" "}
                {predictions.length === 1
                  ? "deelnemer"
                  : "deelnemers"}
              </p>
            </div>

            <div className="space-y-3">
              {predictions.map((prediction) => (
                <PredictionCard
                  key={prediction.id}
                  prediction={prediction}
                />
              ))}
            </div>
          </section>
        )}

        <a
          href="/wedstrijden"
          className="ucl-button-secondary mt-6"
        >
          Terug naar wedstrijden
        </a>
      </div>
    </main>
  );
}

function PredictionCard({
  prediction,
}: {
  prediction: PredictionWithName;
}) {
  const isExact = prediction.points === 3;
  const isCorrectResult = prediction.points === 1;

  const cardClass = isExact
    ? "border-emerald-400/35 bg-emerald-400/10"
    : isCorrectResult
    ? "border-amber-400/35 bg-amber-400/10"
    : "border-rose-400/25 bg-rose-400/10";

  const badgeClass = isExact
    ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-200"
    : isCorrectResult
    ? "border-amber-400/30 bg-amber-400/15 text-amber-200"
    : "border-rose-400/25 bg-rose-400/15 text-rose-200";

  const icon = isExact
    ? "✓"
    : isCorrectResult
    ? "•"
    : "×";

  const resultLabel = isExact
    ? "Exacte score"
    : isCorrectResult
    ? "Juiste winnaar"
    : "Geen punten";

  return (
    <article
      className={`rounded-2xl border p-4 backdrop-blur-xl ${cardClass}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg font-black ${badgeClass}`}
          >
            {icon}
          </div>

          <div className="min-w-0">
            <p className="truncate font-black text-white">
              {prediction.name}
            </p>

            <p className="text-sm font-semibold text-slate-300">
              {resultLabel}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-2xl font-black text-white">
            {prediction.pred_home} -{" "}
            {prediction.pred_away}
          </p>

          <p
            className={`text-sm font-black ${
              isExact
                ? "text-emerald-300"
                : isCorrectResult
                ? "text-amber-300"
                : "text-rose-300"
            }`}
          >
            {prediction.points}{" "}
            {prediction.points === 1
              ? "punt"
              : "punten"}
          </p>
        </div>
      </div>
    </article>
  );
}