"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type PlayerStat = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  goals: number | null;
  yellow_cards: number | null;
};

export default function SpelersstatistiekenPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login?reason=login-required");
        return;
      }

      const { data, error: loadError } = await supabase
        .from("players")
        .select("id,name,shirt_number,position,goals,yellow_cards")
        .eq("active", true)
        .order("shirt_number", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (!active) return;
      if (loadError) setError(loadError.message);
      else setPlayers(data ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [router]);

  const suspended = useMemo(() => players.filter((player) => Number(player.yellow_cards ?? 0) >= 3), [players]);

  return (
    <main className="player-stats-page">
      <header className="player-stats-header">
        <div>
          <p>Collectief Wit en Zwet · Eerste elftal</p>
          <h1>Spelersstatistieken</h1>
          <span>Doelpunten, kaarten & schorsingen</span>
        </div>
        <div className="player-stats-mark">⚽</div>
      </header>

      {loading ? <div className="player-stats-state">Statistieken laden…</div> : null}
      {error ? <div className="player-stats-state is-error">{error}</div> : null}

      {!loading && !error ? (
        <>
          <section className="player-stats-suspended">
            <div className="player-stats-section-title">
              <div><span>⛔</span><div><p>Volgende wedstrijd</p><h2>Geschorsten</h2></div></div>
              <b>{suspended.length}</b>
            </div>
            {suspended.length ? (
              <div className="player-stats-suspended-list">
                {suspended.map((player) => (
                  <article key={player.id}>
                    <strong>{player.name}</strong>
                    <span>{Number(player.yellow_cards ?? 0)} gele kaarten</span>
                  </article>
                ))}
              </div>
            ) : (
              <p className="player-stats-empty">Momenteel geen spelers geschorst op basis van 3 gele kaarten.</p>
            )}
          </section>

          <section className="player-stats-all">
            <div className="player-stats-section-title compact">
              <div><span>👥</span><div><p>Eerste elftal</p><h2>Alle spelers</h2></div></div>
            </div>
            <div className="player-stats-list">
              {players.map((player) => {
                const yellows = Number(player.yellow_cards ?? 0);
                return (
                  <article key={player.id} className={yellows >= 3 ? "is-suspended" : ""}>
                    <div className="player-stats-player">
                      {player.shirt_number ? <span>#{player.shirt_number}</span> : null}
                      <div><strong>{player.name}</strong><small>{player.position ?? "Speler"}</small></div>
                    </div>
                    <div className="player-stats-numbers">
                      <span><small>Goals</small><b>⚽ {Number(player.goals ?? 0)}</b></span>
                      <span><small>Geel</small><b>🟨 {yellows}</b></span>
                    </div>
                    {yellows >= 3 ? <em>Geschorst</em> : null}
                  </article>
                );
              })}
            </div>
          </section>

          <p className="player-stats-note">De statistieken worden handmatig bijgehouden. Bij 3 gele kaarten wordt een speler automatisch als geschorst voor de volgende wedstrijd aangeduid.</p>
        </>
      ) : null}
    </main>
  );
}
