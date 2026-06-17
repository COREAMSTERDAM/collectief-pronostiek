"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";

type Prediction = {
  pred_home: number;
  pred_away: number;
  match_id: number;
};

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string;
  myPrediction?: Prediction;
};

export default function WedstrijdenPage() {
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    async function loadMatches() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        alert("Je moet eerst inloggen.");
        window.location.href = "/login";
        return;
      }

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .order("kickoff", { ascending: true });

      if (matchesError) {
        alert(matchesError.message);
        return;
      }

      const { data: predictionsData, error: predictionsError } = await supabase
        .from("predictions")
        .select("match_id, pred_home, pred_away")
        .eq("user_id", userData.user.id);

      if (predictionsError) {
        alert(predictionsError.message);
        return;
      }

      const merged =
        matchesData?.map((match) => ({
          ...match,
          myPrediction: predictionsData?.find(
            (prediction) => prediction.match_id === match.id
          ),
        })) || [];

      setMatches(merged);
    }

    loadMatches();
  }, []);

return (
  <main className="min-h-screen bg-slate-950 text-white p-6">
    <div className="max-w-md mx-auto pt-10">
      <h1 className="text-3xl font-bold mb-6">Wedstrijden</h1>

      <div className="space-y-4">
        {matches.map((match) => {
          const isClosed = new Date(match.kickoff) <= new Date();

          return (
            <div key={match.id} className="rounded-xl bg-slate-800 p-4">
              <p className="font-bold">
                {match.home_team} - {match.away_team}
              </p>

              <p className="text-slate-300 text-sm">
                {new Date(match.kickoff).toLocaleString("nl-BE")}
              </p>

              <p className="text-slate-400 text-sm mt-1">
                Status: {isClosed ? "gesloten" : match.status}
              </p>

              {match.myPrediction && (
                <p className="text-green-400 text-sm mt-2">
                  Jouw pronostiek: {match.myPrediction.pred_home} -{" "}
                  {match.myPrediction.pred_away}
                </p>
              )}

              {!isClosed ? (
  <a
    href={`/pronostiek/${match.id}`}
    className="block mt-4 w-full bg-white text-black font-bold p-3 rounded-lg text-center"
  >
    {match.myPrediction
      ? "Pronostiek aanpassen"
      : "Pronostiek invullen"}
  </a>
) : (
  <a
    href={`/pronostieken/${match.id}`}
    className="block mt-4 w-full bg-white text-black font-bold p-3 rounded-lg text-center"
  >
    Bekijk pronostieken
  </a>
)}
            </div>
          );
        })}
      </div>
    </div>
  </main>
);
}