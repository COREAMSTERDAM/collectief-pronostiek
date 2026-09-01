"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

const sections = [
  {
    title: "Club",
    items: [
      { href: "/admin/clubnieuws", icon: "📰", title: "Clubnieuws", subtitle: "Clubwebsite, HLN & Nieuwsblad" },
      { href: "/club-preview?tab=kalender", icon: "📅", title: "Kalender", subtitle: "Volledige kalender 2e Afdeling VV A" },
      { href: "/club-preview?tab=uitslagen", icon: "✅", title: "Uitslagen", subtitle: "Officiële uitslagen per speeldag" },
      { href: "/club-preview?tab=klassement", icon: "🏆", title: "Competitieklassement", subtitle: "Stand 2e Afdeling VV A" },
      { href: "/clubhistoriek-preview", icon: "📖", title: "Clubhistoriek", subtitle: "Geschiedenis, mijlpalen & seizoenen" },
      { href: "/spelerskern-preview", icon: "👕", title: "Eerste elftal / spelerskern", subtitle: "Spelers, posities & rugnummers" },
    ],
  },
  {
    title: "Mijn Collectief",
    items: [
      { href: "/profielkeuze", icon: "👤", title: "Profiel", subtitle: "Mijn gegevens" },
      { href: "/club-card", icon: "💳", title: "Club Card", subtitle: "Kaarten & saldo" },
      { href: "/pronostiekhistoriek", icon: "⚽", title: "Pronostieken", subtitle: "Mijn historiek" },
      { href: "/iedereen-coach/mijn-opstellingen", icon: "📋", title: "Coach", subtitle: "Mijn opstellingen" },
    ],
  },
  {
    title: "Supporters",
    items: [
      { href: "/community", icon: "👥", title: "Community", subtitle: "Praat mee met supporters" },
      { href: "/supportersclubs-preview", icon: "🏴", title: "Supportersclubs", subtitle: "Clubs, locaties & contact" },
      { href: "/meldingen", icon: "🔔", title: "Meldingen", subtitle: "Updates & notificaties" },
      { href: "/meldingen/instellingen", icon: "⚙️", title: "Voorkeuren", subtitle: "Kies je meldingen" },
      { href: "/feedback", icon: "💡", title: "Feedback", subtitle: "Help de app verbeteren" },
    ],
  },
];

export default function SupportershubPreviewPage() {
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

  if (loading) return <main className="supportershub-menu-page"><div className="supportershub-menu-loading">Supportershub laden…</div></main>;

  return (
    <main className="supportershub-menu-page">
      <header className="supportershub-menu-header">
        <Link href="/" className="supportershub-menu-back" aria-label="Terug">‹</Link>
        <div><p>Admin preview</p><h1>Supportershub</h1><span>Alles van het collectief op één plek.</span></div>
      </header>
      {sections.map((section) => (
        <section className="supportershub-menu-section" key={section.title}>
          <h2>{section.title}</h2>
          <div className="supportershub-menu-grid">
            {section.items.map((item) => item.disabled ? (
              <div className="supportershub-menu-tile is-disabled" key={item.title}>
                <span className="supportershub-menu-icon">{item.icon}</span><div><strong>{item.title}</strong><small>{item.subtitle}</small></div>
              </div>
            ) : (
              <Link className="supportershub-menu-tile" href={item.href} key={item.title}>
                <span className="supportershub-menu-icon">{item.icon}</span><div><strong>{item.title}</strong><small>{item.subtitle}</small></div><span className="supportershub-menu-arrow">›</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
