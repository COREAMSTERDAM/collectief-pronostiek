"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NativeButton from "@/components/native/NativeButton";
import NativeCard from "@/components/native/NativeCard";
import NativeTile from "@/components/native/NativeTile";
import NotificationBadgeButton from "@/components/notifications/NotificationBadgeButton";
import { supabase } from "@/src/lib/supabase";

type DashboardProfile = {
  name: string | null;
};

type NextMatch = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default function HomePreview() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [nextMatch, setNextMatch] = useState<NextMatch | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) return;

      const [{ data: profileData }, { data: matchData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("matches")
          .select("id, home_team, away_team, kickoff")
          .eq("status", "open")
          .gte("kickoff", new Date().toISOString())
          .order("kickoff", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mounted) return;
      setProfile(profileData ?? null);
      setNextMatch(matchData ?? null);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const firstName = useMemo(() => {
    const value = profile?.name?.trim();
    return value ? value.split(/\s+/)[0] : "supporter";
  }, [profile?.name]);

  return (
    <div className="native-screen supporters-hub-preview">
      <header className="native-home-header supporters-hub-header">
        <div>
          <p className="native-home-greeting">{greeting()}</p>
          <h1 className="native-home-name !text-2xl sm:!text-3xl">
            {firstName} 👋
          </h1>
          <p className="supporters-hub-preview-tag">Nieuwe supportershub · admin preview</p>
        </div>

        <div className="native-home-header-actions">
          <Link href="/profielkeuze" className="native-profile-logo" aria-label="Open profiel">
            <img src="/logo.png" alt="" />
          </Link>
          <NotificationBadgeButton label="" className="native-bell-button" />
        </div>
      </header>

      <NativeCard className="supporters-hub-match" elevated>
        <p className="native-eyebrow">Wedstrijddag</p>
        {nextMatch ? (
          <>
            <h2 className="native-primary-title">
              {nextMatch.home_team}
              <span className="mx-2 text-white/40">–</span>
              {nextMatch.away_team}
            </h2>
            <p className="native-primary-description">
              {new Intl.DateTimeFormat("nl-BE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(nextMatch.kickoff))}
            </p>
            <div className="supporters-hub-match-actions">
              <NativeButton href="/pronostiekpagina" fullWidth>Pronostiek</NativeButton>
              <NativeButton href="/iedereencoachkeuze" variant="secondary" fullWidth>Coach</NativeButton>
            </div>
          </>
        ) : (
          <p className="native-primary-description">Nog geen volgende wedstrijd gepland.</p>
        )}
      </NativeCard>

      <section className="supporters-hub-section">
        <div className="supporters-hub-section-heading">
          <p className="native-eyebrow">Wedstrijd</p>
          <h2>Alles rond de match</h2>
        </div>
        <div className="native-quick-grid">
          <NativeTile href="/pronostiekpagina" title="Pronostiek" image="/pronostiek-logo.png" />
          <NativeTile href="/iedereencoachkeuze" title="Iedereen Coach" image="/coach-logo.png" />
          <NativeTile href="/motmpagina" title={"Man van de\nWedstrijd"} icon="🏅" />
          <NativeTile href="/wedstrijden" title="Wedstrijden" icon="📅" />
        </div>
      </section>

      <section className="supporters-hub-section">
        <div className="supporters-hub-section-heading">
          <p className="native-eyebrow">Club</p>
          <h2>Nieuws & informatie</h2>
        </div>
        <div className="native-quick-grid">
          <NativeTile href="/admin/clubnieuws" title="Clubnieuws" icon="📰" badge="Preview" />
          <NativeTile href="/klassement" title="Klassement" icon="🏆" />
          <NativeTile href="/community" title="Community" image="/community-logo.png" />
          <NativeTile href="/meldingen" title="Meldingen" icon="🔔" />
        </div>
      </section>

      <section className="supporters-hub-section">
        <div className="supporters-hub-section-heading">
          <p className="native-eyebrow">Mijn Collectief</p>
          <h2>Alles van jou</h2>
        </div>
        <div className="native-quick-grid">
          <NativeTile href="/club-card" title="Club Card" icon="💳" />
          <NativeTile href="/profielkeuze" title="Profiel" icon="👤" />
          <NativeTile href="/mijn-pronostieken" title="Mijn voorspellingen" icon="🎯" />
          <NativeTile href="/feedback" title="Feedback" icon="💡" />
        </div>
      </section>

      <NativeCard className="supporters-hub-admin-card" elevated>
        <div>
          <p className="native-eyebrow">Alleen voor jou zichtbaar</p>
          <h2 className="native-secondary-title">Beheer de supportershub</h2>
          <p className="native-primary-description">
            Deze preview mag vrij veranderen. Gewone gebruikers blijven de huidige app zien.
          </p>
        </div>
        <NativeButton href="/admin-keuze" fullWidth>Open beheer</NativeButton>
      </NativeCard>
    </div>
  );
}
