"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Player = { id: number | string; name: string; position?: string | null; number?: number | null; active?: boolean | null };

export default function SpelerskernPreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?reason=login-required"); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!profile?.is_admin) { router.replace("/"); return; }
      const { data } = await supabase.from("players").select("*").order("name", { ascending: true });
      if (active) {
        setPlayers(((data ?? []) as Player[]).filter((p) => p.active !== false));
        setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  if (loading) return <main className="supportershub-menu-page"><div className="supportershub-menu-loading">Spelerskern laden…</div></main>;

  return (
    <main className="supportershub-menu-page">
      <header className="supportershub-menu-header">
        <Link href="/supportershub-preview" className="supportershub-menu-back" aria-label="Terug">‹</Link>
        <div><p>Admin preview · Club</p><h1>Eerste elftal</h1><span>De huidige spelerskern.</span></div>
      </header>
      <section className="supportershub-menu-section">
        <h2>Spelerskern</h2>
        <div className="supportershub-menu-grid">
          {players.map((player) => (
            <div className="supportershub-menu-tile" key={String(player.id)}>
              <span className="supportershub-menu-icon">👕</span>
              <div><strong>{player.name}</strong><small>{player.position ?? "Speler"}{player.number ? ` · #${player.number}` : ""}</small></div>
            </div>
          ))}
          {!players.length ? <div className="supportershub-menu-tile is-disabled"><span className="supportershub-menu-icon">👕</span><div><strong>Nog geen spelers</strong><small>Voeg spelers toe via het bestaande spelersbeheer.</small></div></div> : null}
        </div>
      </section>
    </main>
  );
}
