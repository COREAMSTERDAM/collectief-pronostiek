"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SupportersclubsPreviewPage() {
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

  if (loading) return <main className="supportersclubs-preview-page"><div className="supportershub-menu-loading">Supportersclubs laden…</div></main>;

  return (
    <main className="supportersclubs-preview-page">
      <header className="supportershub-menu-header">
        <Link href="/supportershub-preview" className="supportershub-menu-back" aria-label="Terug">‹</Link>
        <div><p>Supportershub</p><h1>Supportersclubs</h1><span>Vind supportersclubs, contact en activiteiten.</span></div>
      </header>
      <section className="supportersclubs-intro-card">
        <span className="supportersclubs-intro-icon">🏴</span>
        <div><p className="native-eyebrow">Samen supporter</p><h2>Supportersclubs op één plek</h2><p>Per supportersclub kunnen we het logo, de locatie, contactgegevens, ontmoetingsplaats, activiteiten en info over verplaatsingen tonen.</p></div>
      </section>
      <section className="supportersclubs-empty-card">
        <div className="supportersclubs-empty-icon">👥</div><h2>Nog geen supportersclubs toegevoegd</h2><p>Deze preview is klaar om echte supportersclubs toe te voegen. We tonen bewust nog geen fictieve clubs.</p>
      </section>
      <section className="supportersclubs-feature-grid">
        <article><span>📍</span><strong>Locatie</strong><small>Adres & ontmoetingsplaats</small></article>
        <article><span>☎️</span><strong>Contact</strong><small>Contactpersoon & kanalen</small></article>
        <article><span>🚌</span><strong>Verplaatsingen</strong><small>Bus- en awayday-info</small></article>
        <article><span>📅</span><strong>Activiteiten</strong><small>Events & bijeenkomsten</small></article>
      </section>
    </main>
  );
}
