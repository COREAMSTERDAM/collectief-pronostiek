"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
};

type MyPrediction = {
  id: number;
  pred_home: number;
  pred_away: number;
  points: number;
  match_id: number;
  match?: Match;
};

export default function MijnPronostiekenPage() {
  const [predictions, setPredictions] = useState<MyPrediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPredictions() {
      setLoading(true);

const { data: userData } =
  await supabase.auth.getUser();

if (!userData.user) {
  window.location.href = "/login?reason=login-required";
  return;
}

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const {
        data: predictionsData,
        error: predictionsError,
      } = await supabase
        .from("predictions")
        .select("id, pred_home, pred_away, points, match_id")
        .eq("user_id", userData.user.id)
        .order("match_id", { ascending: false });

      if (predictionsError) {
        alert(predictionsError.message);
        setLoading(false);
        return;
      }

      const matchIds =
        predictionsData?.map(
          (prediction) => prediction.match_id
        ) ?? [];

      if (matchIds.length === 0) {
        setPredictions([]);
        setLoading(false);
        return;
      }

      const {
        data: matchesData,
        error: matchesError,
      } = await supabase
        .from("matches")
        .select(
          "id, home_team, away_team, kickoff, home_score, away_score, status"
        )
        .in("id", matchIds);

      if (matchesError) {
        alert(matchesError.message);
        setLoading(false);
        return;
      }

      const merged: MyPrediction[] =
        predictionsData?.map((prediction) => ({
          ...prediction,
          match: matchesData?.find(
            (match) =>
              Number(match.id) ===
              Number(prediction.match_id)
          ),
        })) ?? [];

      merged.sort((a, b) => {
        const kickoffA = a.match?.kickoff
          ? new Date(a.match.kickoff).getTime()
          : 0;

        const kickoffB = b.match?.kickoff
          ? new Date(b.match.kickoff).getTime()
          : 0;

        return kickoffB - kickoffA;
      });

      setPredictions(merged);
      setLoading(false);
    }

    loadPredictions();
  }, []);

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

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-7">
          <h1 className="ucl-title">
            Mijn pronostieken
          </h1>

          <p className="ucl-subtitle">
            Bekijk je voorspellingen, resultaten en behaalde
            punten.
          </p>
        </div>

        {predictions.length === 0 ? (
          <div className="ucl-card">
            <p className="ucl-muted">
              Je hebt nog geen pronostieken ingevuld.
            </p>

            <a
              href="/wedstrijden"
              className="ucl-button-primary"
            >
              Bekijk wedstrijden
            </a>
          </div>
        ) : (
          <div className="space-y-5">
            {predictions.map((prediction) => {
              const match = prediction.match;

              const isClosed = match
                ? new Date(match.kickoff).getTime() <=
                  Date.now()
                : false;

              const hasResult =
                match?.home_score !== null &&
                match?.home_score !== undefined &&
                match?.away_score !== null &&
                match?.away_score !== undefined;

              return (
                <article
                  key={prediction.id}
                  className="ucl-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="ucl-match-title">
                        {match?.home_team ?? "Onbekend"} -{" "}
                        {match?.away_team ?? "Onbekend"}
                      </p>

                      {match?.kickoff && (
                        <p className="ucl-muted">
                          {new Date(
                            match.kickoff
                          ).toLocaleString("nl-BE")}
                        </p>
                      )}
                    </div>

                    <div className="ucl-status shrink-0">
                      <span>{isClosed ? "🔒" : "●"}</span>

                      <span>
                        {isClosed ? "Gesloten" : "Open"}
                      </span>
                    </div>
                  </div>

                  <div className="ucl-card-dark">
                    <p className="ucl-muted">
                      Mijn pronostiek
                    </p>

                    <p className="mt-1 text-center text-3xl font-black text-white">
                      {prediction.pred_home} -{" "}
                      {prediction.pred_away}
                    </p>
                  </div>

                  {hasResult && (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-sm font-semibold text-slate-300">
                        Officiële uitslag
                      </span>

                      <span className="font-black text-white">
                        {match.home_score} -{" "}
                        {match.away_score}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-300/20 bg-amber-400/10 p-3">
                    <span className="text-sm font-bold text-amber-100">
                      Behaalde punten
                    </span>

                    <span className="text-xl font-black text-amber-300">
                      {prediction.points ?? 0}
                    </span>
                  </div>

                  {!isClosed ? (
                    <a
                      href={`/pronostiek/${prediction.match_id}`}
                      className="ucl-button-primary"
                    >
                      Bekijken / aanpassen
                    </a>
                  ) : (
                    <a
                      href={`/pronostieken/${prediction.match_id}`}
                      className="ucl-button-primary"
                    >
                      Bekijk alle pronostieken
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <a
          href="/"
          className="ucl-button-secondary mt-6"
        >
          Terug naar dashboard
        </a>
      </div>
    </main>
  );
}