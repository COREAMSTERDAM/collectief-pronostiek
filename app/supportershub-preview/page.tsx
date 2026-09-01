"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type SupportershubItem = {
  href: string;
  icon: string;
  title: string;
  subtitle: string;
  disabled?: boolean;
};

type SupportershubSection = {
  title: string;
  items: SupportershubItem[];
};

const sections: SupportershubSection[] = [
  {
    title: "Club",
    items: [
      { href: "/admin/clubnieuws", icon: "📰", title: "Clubnieuws", subtitle: "Clubwebsite, HLN & Nieuwsblad" },
      { href: "/club-preview", icon: "🏆", title: "2e Amateur VV A", subtitle: "Kalender, uitslagen & klassement" },
    ],
  },
  {
    title: "Mijn Collectief",
    items: [
      { href: "/profiel", icon: "👤", title: "Profiel", subtitle: "Mijn persoonlijke gegevens" },
      { href: "/membership-preview", icon: "🎫", title: "Membership", subtitle: "Mijn lidmaatschap & geldigheid" },
      { href: "/club-card", icon: "💳", title: "Club Card", subtitle: "Beheer mijn gekoppelde kaarten" },
      { href: "/pronostiekhistoriek", icon: "⚽", title: "Pronostiekhistoriek", subtitle: "Mijn eerdere voorspellingen" },
      { href: "/iedereen-coach/mijn-opstellingen", icon: "📋", title: "Coach-historiek", subtitle: "Mijn eerdere opstellingen" },
      { href: "/meldingen/instellingen", icon: "🔔", title: "Meldingsvoorkeuren", subtitle: "Kies welke meldingen ik ontvang" },
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
