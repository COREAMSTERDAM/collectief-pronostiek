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
  is_admin: boolean | null;
};

function greeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

export default function Home() {
  const [profile, setProfile] =
    useState<DashboardProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] =
    useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setIsLoggedIn(false);
          return;
        }

        setIsLoggedIn(true);

        const { data } = await supabase
          .from("profiles")
          .select("name, is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (mounted) setProfile(data ?? null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const firstName = useMemo(() => {
    const value = profile?.name?.trim();

    return value
      ? value.split(/\s+/)[0]
      : "supporter";
  }, [profile?.name]);

  if (!loading && !isLoggedIn) {
    return (
      <div className="native-screen native-screen-centered">
        <div className="native-auth-hero">
          <img
            src="/logo.png"
            alt="Collectief Wit en Zwet"
            className="native-auth-logo"
          />

          <p className="native-eyebrow">
            Supporterscollectief
          </p>

          <h1 className="native-welcome-title">
            Alles van het collectief in één app.
          </h1>

          <p className="native-welcome-copy">
            Community, pronostiek, Club Card en
            Iedereen Coach.
          </p>

          <div className="native-auth-actions">
            <NativeButton href="/login" fullWidth>
              Inloggen
            </NativeButton>

            <NativeButton
              href="/registreren"
              variant="secondary"
              fullWidth
            >
              Account aanmaken
            </NativeButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="native-screen native-home-screen native-home-compact">
      <header className="native-home-header">
        <div className="min-w-0">
          <p className="native-home-greeting">
            {greeting()}
          </p>

          <h1 className="native-home-name">
            {loading ? "Welkom" : `${firstName} 👋`}
          </h1>
        </div>

        <div className="native-home-header-actions">
          <Link
            href="/profielkeuze"
            className="native-profile-logo"
            aria-label="Open profiel"
          >
            <img src="/logo.png" alt="" />
          </Link>

          <NotificationBadgeButton
            label=""
            className="native-bell-button"
          />
        </div>
      </header>

      <NativeCard
        className="native-primary-card native-primary-card-compact"
        elevated
      >
        <div className="native-primary-card-copy">
          <p className="native-eyebrow">
            Volgende actie
          </p>

          <h2 className="native-primary-title">
            Vul je pronostiek in
          </h2>

          <p className="native-primary-description">
            Klaar voor de volgende speelronde?
          </p>
        </div>

        <NativeButton
          href="/pronostiekpagina"
          fullWidth
        >
          Nu invullen
          <span aria-hidden="true">›</span>
        </NativeButton>
      </NativeCard>

      <section className="native-home-section native-home-section-compact">
  <div className="native-quick-grid">
    <NativeTile
      href="/pronostiekpagina"
      title="Pronostiek"
      icon="⚽"
    />

    {profile?.is_admin ? (
      <>
        <NativeTile
          href="/community"
          title="Community"
          icon="💬"
        />

        <NativeTile
          href="/club-card"
          title="Club Card"
          icon="▣"
        />
      </>
    ) : null}

    <NativeTile
      href="/iedereencoachkeuze"
      title="Coach"
      icon="🧠"
    />
  </div>
</section>

      <section className="native-home-compact-actions">
        <Link
          href="/meldingen"
          className="native-home-action-pill"
        >
          <span>🔔</span>
          <span>Meldingen</span>
        </Link>

        <Link
          href="/klassement"
          className="native-home-action-pill"
        >
          <span>🏆</span>
          <span>Klassement</span>
        </Link>

        {profile?.is_admin ? (
          <Link
            href="/admin-keuze"
            className="native-home-action-pill"
          >
            <span>⚙️</span>
            <span>Beheer</span>
          </Link>
        ) : (
          <Link
            href="/feedback"
            className="native-home-action-pill"
          >
            <span>💡</span>
            <span>Feedback</span>
          </Link>
        )}
      </section>
    </div>
  );
}
