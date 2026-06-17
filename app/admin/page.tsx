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

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);

  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [kickoff, setKickoff] = useState("");

  useEffect(() => {
    async function checkAdminAndLoad() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        window.location.href = "/login";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userData.user.id)
        .single();

      if (error || !data?.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadMatches();
      setLoading(false);
    }

    checkAdminAndLoad();
  }, []);

  async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("kickoff", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setMatches(data || []);
  }

  async function saveMatch() {
    if (!homeTeam || !awayTeam || !kickoff) {
      alert("Vul alle velden in.");
      return;
    }

    const { error } = await supabase.from("matches").insert({
      home_team: homeTeam,
      away_team: awayTeam,
      kickoff,
      status: "open",
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Wedstrijd toegevoegd!");
    setHomeTeam("");
    setAwayTeam("");
    setKickoff("");
    await loadMatches();
  }

  async function saveResult(matchId: number, homeScore: number, awayScore: number) {
    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "afgewerkt",
      })
      .eq("id", matchId);

    if (matchError) {
      alert(matchError.message);
      return;
    }

    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("*")
      .eq("match_id", matchId);

    if (predictionsError) {
      alert(predictionsError.message);
      return;
    }

    for (const prediction of predictions || []) {
      let points = 0;

      const exactScore =
        prediction.pred_home === homeScore &&
        prediction.pred_away === awayScore;

      const realResult =
        homeScore > awayScore ? "home" : homeScore < awayScore ? "away" : "draw";

      const predictedResult =
        prediction.pred_home > prediction.pred_away
          ? "home"
          : prediction.pred_home < prediction.pred_away
          ? "away"
          : "draw";

      if (exactScore) {
        points = 3;
      } else if (realResult === predictedResult) {
        points = 1;
      }

      const { error: updateError } = await supabase
        .from("predictions")
        .update({ points })
        .eq("id", prediction.id);

      if (updateError) {
        alert(updateError.message);
        return;
      }
    }

    alert("Uitslag opgeslagen en punten berekend!");
    await loadMatches();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        Laden...
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-md mx-auto pt-10">
          <h1 className="text-3xl font-bold mb-4">Geen toegang</h1>
          <p className="text-slate-300">
            Je hebt geen adminrechten voor deze pagina.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Admin</h1>

        <div className="rounded-xl bg-slate-800 p-4 mb-8 space-y-4">
          <h2 className="text-xl font-bold">Wedstrijd toevoegen</h2>

          <input
            type="text"
            placeholder="Thuisploeg"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700"
          />

          <input
            type="text"
            placeholder="Uitploeg"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700"
          />

          <input
            type="datetime-local"
            value={kickoff}
            onChange={(e) => setKickoff(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-700"
          />

          <button
            onClick={saveMatch}
            className="w-full bg-white text-black font-bold p-3 rounded-lg"
          >
            Wedstrijd toevoegen
          </button>
        </div>

        <h2 className="text-xl font-bold mb-4">Bestaande wedstrijden</h2>

        <div className="space-y-4">
          {matches.map((match) => (
            <MatchResultCard
              key={match.id}
              match={match}
              onSave={saveResult}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function MatchResultCard({
  match,
  onSave,
}: {
  match: Match;
  onSave: (matchId: number, homeScore: number, awayScore: number) => void;
}) {
  const [homeScore, setHomeScore] = useState(
    match.home_score?.toString() || ""
  );
  const [awayScore, setAwayScore] = useState(
    match.away_score?.toString() || ""
  );

  return (
    <div className="rounded-xl bg-slate-800 p-4">
      <p className="font-bold">
        {match.home_team} - {match.away_team}
      </p>

      <p className="text-slate-300 text-sm">
        {new Date(match.kickoff).toLocaleString("nl-BE")}
      </p>

      <p className="text-slate-400 text-sm mt-1">
        Status: {match.status}
      </p>

      <div className="flex gap-4 mt-4">
        <input
          type="number"
          placeholder="Thuis"
          value={homeScore}
          onChange={(e) => setHomeScore(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-700"
        />

        <input
          type="number"
          placeholder="Uit"
          value={awayScore}
          onChange={(e) => setAwayScore(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-700"
        />
      </div>

      <button
        onClick={() => {
          if (homeScore === "" || awayScore === "") {
            alert("Vul beide scores in.");
            return;
          }

          onSave(match.id, Number(homeScore), Number(awayScore));
        }}
        className="w-full bg-white text-black font-bold p-3 rounded-lg mt-4"
      >
        Uitslag opslaan + punten berekenen
      </button>
    </div>
  );
}