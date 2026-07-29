"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../src/lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
};

type ExistingPrediction = {
  pred_home: number;
  pred_away: number;
};

export default function PronostiekPage() {
  const params = useParams();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<Match | null>(null);
  const [thuis, setThuis] = useState("");
  const [uit, setUit] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadPage() {
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
          .select("id, home_team, away_team, kickoff")
          .eq("id", matchId)
          .single();

      if (matchError) {
        alert(matchError.message);
        setLoading(false);
        return;
      }

      setMatch(matchData);

      const {
        data: predictionData,
        error: predictionError,
      } = await supabase
        .from("predictions")
        .select("pred_home, pred_away")
        .eq("user_id", userData.user.id)
        .eq("match_id", matchId)
        .maybeSingle();

      if (predictionError) {
        alert(predictionError.message);
        setLoading(false);
        return;
      }

      const existingPrediction =
        predictionData as ExistingPrediction | null;

      if (existingPrediction) {
        setThuis(existingPrediction.pred_home.toString());
        setUit(existingPrediction.pred_away.toString());
      }

      setLoading(false);
    }

    loadPage();
  }, [matchId]);

  async function savePrediction() {
    if (!match || saving) {
      return;
    }

    const kickoffTime = new Date(match.kickoff).getTime();

    if (Date.now() >= kickoffTime) {
      alert(
        "Deze wedstrijd is gestart. Pronostieken zijn gesloten."
      );
      return;
    }

    if (thuis === "" || uit === "") {
      alert("Vul voor beide ploegen een score in.");
      return;
    }

    const homePrediction = Number(thuis);
    const awayPrediction = Number(uit);

    if (
      !Number.isInteger(homePrediction) ||
      !Number.isInteger(awayPrediction) ||
      homePrediction < 0 ||
      awayPrediction < 0
    ) {
      alert("Vul geldige, positieve gehele scores in.");
      return;
    }

    setSaving(true);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError) {
      alert(userError.message);
      setSaving(false);
      return;
    }

    if (!userData.user) {
      alert("Je moet ingelogd zijn.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("predictions")
      .upsert(
        {
          user_id: userData.user.id,
          match_id: matchId,
          pred_home: homePrediction,
          pred_away: awayPrediction,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,match_id",
        }
      );

    if (error) {
      alert(error.message);
      setSaving(false);
      return;
    }

    alert("Pronostiek opgeslagen!");
    window.location.href = "/wedstrijden";
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">
              Wedstrijd laden...
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
    new Date(match.kickoff).getTime() <= Date.now();

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="mb-7">
          <h1 className="ucl-title">
            Pronostiek invullen
          </h1>

          <p className="ucl-subtitle">
            Voorspel de eindstand vóór de aftrap.
          </p>
        </div>

        <section className="ucl-card">
          <div className="text-center">
            <div className="ucl-status">
              <span>{isClosed ? "🔒" : "●"}</span>

              <span>
                {isClosed
                  ? "Pronostieken gesloten"
                  : "Open voor pronostieken"}
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

          <div className="ucl-card-dark">
            <p className="mb-4 text-center text-sm font-black uppercase tracking-wider text-slate-300">
              Jouw voorspelling
            </p>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <label
                  htmlFor="home-prediction"
                  className="mb-2 block truncate text-center text-sm font-bold text-slate-200"
                >
                  {match.home_team}
                </label>

                <input
                  id="home-prediction"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  value={thuis}
                  disabled={isClosed || saving}
                  onChange={(e) => setThuis(e.target.value)}
                  className="ucl-input text-center text-3xl font-black"
                />
              </div>

              <div className="pb-3 text-2xl font-black text-slate-500">
                –
              </div>

              <div>
                <label
                  htmlFor="away-prediction"
                  className="mb-2 block truncate text-center text-sm font-bold text-slate-200"
                >
                  {match.away_team}
                </label>

                <input
                  id="away-prediction"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  value={uit}
                  disabled={isClosed || saving}
                  onChange={(e) => setUit(e.target.value)}
                  className="ucl-input text-center text-3xl font-black"
                />
              </div>
            </div>
          </div>

          {isClosed ? (
            <a
              href={`/pronostieken/${match.id}`}
              className="ucl-button-primary"
            >
              Bekijk alle pronostieken
            </a>
          ) : (
            <button
              type="button"
              onClick={savePrediction}
              disabled={saving}
              className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Pronostiek opslaan..."
                : "Pronostiek opslaan"}
            </button>
          )}

          <a
            href="/wedstrijden"
            className="ucl-button-secondary mt-3"
          >
            Terug naar wedstrijden
          </a>
        </section>
      </div>
    </main>
  );
}