"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabase";
import { useParams } from "next/navigation";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
};

export default function PronostiekPage() {
  const params = useParams();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<Match | null>(null);
  const [thuis, setThuis] = useState("");
  const [uit, setUit] = useState("");

  useEffect(() => {
    async function loadMatch() {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setMatch(data);
    }

    loadMatch();
  }, [matchId]);

  async function savePrediction() {
      if (!match) return;

  const kickoffDate = new Date(match.kickoff);
  const now = new Date();

  if (now >= kickoffDate) {
    alert("Deze wedstrijd is gestart. Pronostieken zijn gesloten.");
    return;
  }
    
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      alert("Je moet ingelogd zijn.");
      return;
    }

    const { error } = await supabase.from("predictions").upsert({
      user_id: userData.user.id,
      match_id: matchId,
      pred_home: Number(thuis),
      pred_away: Number(uit),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Pronostiek opgeslagen!");
    window.location.href = "/wedstrijden";
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-6">
        Laden...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Pronostiek invullen</h1>

        <div className="rounded-xl bg-slate-800 p-4 mb-6">
          <p className="font-bold text-xl">
            {match.home_team} - {match.away_team}
          </p>
          <p className="text-slate-300 text-sm">
            {new Date(match.kickoff).toLocaleString("nl-BE")}
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <input
            type="number"
            placeholder="Thuis"
            value={thuis}
            onChange={(e) => setThuis(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800"
          />

          <input
            type="number"
            placeholder="Uit"
            value={uit}
            onChange={(e) => setUit(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800"
          />
        </div>

        <button
          onClick={savePrediction}
          className="w-full bg-white text-black font-bold p-3 rounded-lg"
        >
          Opslaan
        </button>
      </div>
    </main>
  );
}