"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function ClubHistoriekPreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function guard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?reason=login-required"); return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!profile?.is_admin) { router.replace("/"); return; }
      if (active) setLoading(false);
    }
    void guard();
    return () => { active = false; };
  }, [router]);

  if (loading) return <main className="supportershub-menu-page"><div className="supportershub-menu-loading">Clubhistoriek laden…</div></main>;

  return (
    <main className="supportershub-menu-page">
      <header className="supportershub-menu-header">
        <Link href="/supportershub-preview" className="supportershub-menu-back" aria-label="Terug">‹</Link>
        <div><p>Admin preview · Club</p><h1>Clubhistoriek</h1><span>De geschiedenis van de club op één plek.</span></div>
      </header>
      <section className="supportershub-menu-section">
        <h2>In opbouw</h2>
        <div className="supportershub-menu-grid">
          <div className="supportershub-menu-tile is-disabled"><span className="supportershub-menu-icon">🏛️</span><div><strong>Mijlpalen</strong><small>Belangrijke momenten uit de clubgeschiedenis.</small></div></div>
          <div className="supportershub-menu-tile is-disabled"><span className="supportershub-menu-icon">📆</span><div><strong>Seizoenen</strong><small>Historische seizoenen, reeksen en resultaten.</small></div></div>
          <div className="supportershub-menu-tile is-disabled"><span className="supportershub-menu-icon">🏆</span><div><strong>Palmares</strong><small>Promoties, titels en andere prestaties.</small></div></div>
          <div className="supportershub-menu-tile is-disabled"><span className="supportershub-menu-icon">🖼️</span><div><strong>Archief</strong><small>Foto's, affiches en herinneringen.</small></div></div>
        </div>
      </section>
    </main>
  );
}
