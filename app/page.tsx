"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import NativeButton from "@/components/native/NativeButton";
import NativeCard from "@/components/native/NativeCard";
import NativeListRow from "@/components/native/NativeListRow";
import NativeSectionHeader from "@/components/native/NativeSectionHeader";
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
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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
    return value ? value.split(/\s+/)[0] : "supporter";
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

          <p className="native-eyebrow">Supporterscollectief</p>
          <h1 className="native-welcome-title">
            Alles van het collectief in één app.
          </h1>
          <p className="native-welcome-copy">
            Community, pronostiek, Club Card en Iedereen Coach — eenvoudig en
            altijd binnen handbereik.
          </p>

          <div className="native-auth-actions">
            <NativeButton href="/login" fullWidth>
              Inloggen
            </NativeButton>
            <NativeButton href="/registreren" variant="secondary" fullWidth>
              Account aanmaken
            </NativeButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="native-screen native-home-screen">
      <header className="native-home-header">
        <div>
          <p className="native-home-greeting">{greeting()}</p>
          <h1 className="native-home-name">
            {loading ? "Welkom" : `${firstName} 👋`}
          </h1>
          <p className="native-home-subtitle">Fijn dat je er bent.</p>
        </div>

        <div className="native-home-header-actions">
          <Link href="/profielkeuze" className="native-profile-logo">
            <img src="/logo.png" alt="Profiel" />
          </Link>
          <NotificationBadgeButton label="" className="native-bell-button" />
        </div>
      </header>

      <NativeCard className="native-primary-card" elevated>
        <div className="native-primary-card-copy">
          <p className="native-eyebrow">Vandaag in de app</p>
          <h2 className="native-primary-title">
            Klaar voor de volgende speelronde?
          </h2>
          <p className="native-primary-description">
            Vul je pronostiek in en bekijk daarna hoe je ervoor staat.
          </p>
        </div>

        <NativeButton href="/pronostiekpagina" fullWidth>
          Pronostiek invullen <span aria-hidden="true">›</span>
        </NativeButton>
      </NativeCard>

      <section className="native-home-section">
        <NativeSectionHeader title="Snel naar" />
        <div className="native-quick-grid">
          <NativeTile
            href="/pronostiekpagina"
            title="Pronostiek"
            icon="⚽"
            subtitle="Wedstrijden"
          />
          <NativeTile
            href="/community"
            title="Community"
            icon="💬"
            subtitle="Praat mee"
          />
          <NativeTile
            href="/club-card"
            title="Club Card"
            icon="▣"
            subtitle="Saldo & opladen"
          />
          <NativeTile
            href="/iedereencoachkeuze"
            title="Iedereen Coach"
            icon="🧠"
            subtitle="Stel je team op"
          />
        </div>
      </section>

      <section className="native-home-section">
        <NativeSectionHeader title="Voor jou" />
        <NativeCard className="native-list-card">
          <NativeListRow
            href="/meldingen"
            icon="🔔"
            title="Meldingen"
            subtitle="Bekijk wat je gemist hebt"
          />
          <NativeListRow
            href="/community"
            icon="💬"
            title="Nieuwe gesprekken"
            subtitle="Ga verder waar je gebleven was"
          />
        </NativeCard>
      </section>

      <section className="native-home-section">
        <NativeSectionHeader title="Meer" />
        <NativeCard className="native-list-card">
          <NativeListRow
            href="/klassement"
            icon="🏆"
            title="Klassement"
            subtitle="Bekijk de algemene rangschikking"
          />
          <NativeListRow
            href="/motmpagina"
            icon="⭐"
            title="Man van de wedstrijd"
            subtitle="Breng je stem uit"
          />
          <NativeListRow
            href="/feedback"
            icon="💡"
            title="Feedback"
            subtitle="Help de app verbeteren"
          />
          {profile?.is_admin ? (
            <NativeListRow
              href="/admin-keuze"
              icon="⚙️"
              title="Beheer"
              subtitle="Open het adminpanel"
            />
          ) : null}
        </NativeCard>
      </section>
    </div>
  );
}
