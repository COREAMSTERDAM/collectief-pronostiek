"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import HubCard from "@/components/navigation/HubCard";
import { supabase } from "@/src/lib/supabase";

type DashboardProfile = {
  name: string | null;
  is_admin: boolean | null;
};

export default function Home() {
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
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
        if (mounted) setAuthLoading(false);
      }
    }

    void loadSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function logout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      window.location.href = "/";
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <section className="ucl-card text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Supporterscollectief
          </p>

          <img
            src="/logo.png"
            alt="Logo Collectief Wit en Zwet"
            className="ucl-logo"
          />

          <h1 className="ucl-title">
            {isLoggedIn && profile?.name
              ? `Welkom, ${profile.name}`
              : "Collectief Wit en Zwet"}
          </h1>

          <p className="ucl-subtitle mx-auto max-w-2xl">
            Voorspel wedstrijden, stel je basiself samen, beoordeel spelers en
            volg alle klassementen vanuit één overzicht.
          </p>

          {!authLoading ? (
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              {!isLoggedIn ? (
                <>
                  <Link href="/login" className="ucl-button-primary !mt-0">
                    🔐 Inloggen
                  </Link>

                  <Link href="/registreren" className="ucl-button-secondary">
                    📝 Registreren
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void logout()}
                  disabled={loggingOut}
                  className="ucl-button-danger !mt-0 disabled:opacity-40"
                >
                  {loggingOut ? "Uitloggen…" : "🚪 Uitloggen"}
                </button>
              )}
            </div>
          ) : null}
        </section>

        <section className="mt-6 grid gap-5 md:grid-cols-2">
          <HubCard
            href="/pronostiekpagina"
            icon="⚽"
            eyebrow="Pronostiek"
            title="Voorspel de wedstrijden"
            description="Vul pronostieken in, bekijk je eerdere pronostieken en volg de algemene rangschikking."
            action="Open Pronostiek"
            accent="sky"
          />

          <HubCard
            href="/iedereencoachkeuze"
            icon="🧠"
            eyebrow="Iederiejn Coach"
            title="Word de beste coach"
            description="Stel een basiself samen, beoordeel spelers en ontdek wat andere supporters kiezen."
            action="Open Iederiejn Coach"
            accent="amber"
          />

          <HubCard
            href="/motmpagina"
            icon="⭐"
            eyebrow="Man van de wedstrijd"
            title="Kies jouw man van de match"
            description="Breng je stem uit, bekijk de uitslagen en volg de speler van het seizoen."
            action="Open Man van de Wedstrijd"
            accent="purple"
          />

          <HubCard
            href="/klassement"
            icon="🏆"
            eyebrow="Klassement"
            title="Bekijk de rangschikking"
            description="Volg de pronostiekstand, recente vorm en grootste stijgers."
            action="Open klassement"
            accent="emerald"
          />

          {isLoggedIn ? (
            <HubCard
              href="/profielkeuze"
              icon="👤"
              eyebrow="Mijn account"
              title="Profiel en prestaties"
              description="Bekijk je profiel, voorspellingen, statistieken en persoonlijke prestaties."
              action="Open mijn account"
              accent="white"
            />
          ) : (
            <HubCard
              href="/login"
              icon="🔐"
              eyebrow="Account"
              title="Log in om mee te spelen"
              description="Meld je aan om pronostieken, opstellingen en stemmen op te slaan."
              action="Inloggen"
              accent="white"
            />
          )}

          {profile?.is_admin ? (
            <HubCard
              href="/admin-keuze"
              icon="⚙️"
              eyebrow="Admin"
              title="Beheer de applicatie"
              description="Beheer gebruikers, wedstrijden, spelers en Iedereen Coach."
              action="Open admin"
              accent="rose"
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
