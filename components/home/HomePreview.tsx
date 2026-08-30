"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NotificationBadgeButton from "@/components/notifications/NotificationBadgeButton";
import SponsorCarousel from "@/components/home/SponsorCarousel";
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

const primaryTiles = [
  { href: "/pronostiekpagina", title: "Pronostiek", icon: "⚽" },
  { href: "/iedereencoachkeuze", title: "Coach", icon: "▣" },
  { href: "/motmpagina", title: "Man van de\nWedstrijd", icon: "🏅" },
  { href: "/admin/clubnieuws", title: "Clubnieuws", icon: "📰" },
  { href: "/club-card", title: "Club Card", icon: "💳" },
  { href: "/club-preview", title: "Club", icon: "🏟️" },
];

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

  const matchDate = nextMatch
    ? new Intl.DateTimeFormat("nl-BE", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(nextMatch.kickoff))
    : null;

  return (
    <div className="native-screen supporters-hub-preview supporters-hub-preview-compact">
      <header className="supporters-hub-compact-header">
        <div className="min-w-0">
          <p className="supporters-hub-compact-greeting">{greeting()}</p>
          <h1 className="supporters-hub-compact-name">{firstName} 👋</h1>
        </div>

        <div className="supporters-hub-compact-header-actions">
          <Link href="/profielkeuze" className="native-profile-logo" aria-label="Open profiel">
            <img src="/logo.png" alt="" />
          </Link>
          <NotificationBadgeButton label="" className="native-bell-button" />
        </div>
      </header>

      <SponsorCarousel />

      <section className="supporters-hub-compact-match" aria-label="Volgende wedstrijd">
        <div className="supporters-hub-compact-match-copy">
          <p className="supporters-hub-compact-eyebrow">Volgende wedstrijd</p>
          {nextMatch ? (
            <>
              <h2>
                {nextMatch.home_team}
                <span> – </span>
                {nextMatch.away_team}
              </h2>
              <p>{matchDate}</p>
            </>
          ) : (
            <>
              <h2>Nog geen wedstrijd gepland</h2>
              <p>Nieuwe wedstrijd verschijnt hier automatisch.</p>
            </>
          )}
        </div>

        {nextMatch ? (
          <Link href="/matchcenter-preview" className="supporters-hub-compact-match-button">
            Matchcenter <span aria-hidden="true">›</span>
          </Link>
        ) : null}
      </section>

      <section className="supporters-hub-compact-grid" aria-label="Hoofdfuncties">
        {primaryTiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="supporters-hub-compact-tile">
            <span className="supporters-hub-compact-tile-icon" aria-hidden="true">
              {tile.icon}
            </span>
            <span className="supporters-hub-compact-tile-title">
              {tile.title.split("\n").map((line, index) => (
                <span key={`${tile.title}-${index}`}>{line}</span>
              ))}
            </span>
          </Link>
        ))}
      </section>

      <section className="supporters-hub-compact-actions" aria-label="Extra functies">
        <Link href="/community" className="supporters-hub-compact-pill">
          <span aria-hidden="true">👥</span>
          <span>Community</span>
        </Link>
        <Link href="/meldingen" className="supporters-hub-compact-pill">
          <span aria-hidden="true">🔔</span>
          <span>Meldingen</span>
        </Link>
        <Link href="/profielkeuze" className="supporters-hub-compact-pill">
          <span aria-hidden="true">•••</span>
          <span>Meer</span>
        </Link>
      </section>
    </div>
  );
}
