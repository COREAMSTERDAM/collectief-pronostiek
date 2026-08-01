"use client";

import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

const navigation = [
  {
    href: "/pronostiekpagina",
    label: "Pronostiek",
    description: "Voorspel de volgende wedstrijden.",
    icon: "⚽",
    primary: true,
  },
  {
    href: "/iedereencoachkeuze",
    label: "Iedereen Coach BETA",
    description: "Stel per wedstrijd jouw ideale basiself samen.",
    icon: "🧠",
  },
  {
    href: "/motmpagina",
    label: "Man van de wedstrijd",
    description: "Stem op de sterkste speler.",
    icon: "⭐",
  },
  {
    href: "/klassement",
    label: "Klassement",
    description: "Bekijk jouw positie en de top van de ranking.",
    icon: "🏆",
  },
  {
    href: "/profiel",
    label: "Mijn profiel",
    description: "Bekijk je statistieken en prestaties.",
    icon: "👤",
  },
];

export default function Home() {
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Supporterscollectief
          </p>

          <img
            src="/logo.png"
            alt="Logo Collectief Pronostiek"
            className="ucl-logo"
          />

          <h1 className="ucl-title">Collectief Wit en Zwet</h1>

          <p className="ucl-subtitle mx-auto max-w-sm">
            Voorspel wedstrijden, stel je basiself samen, stem op spelers
            en strijd mee voor de eerste plaats.
          </p>
        </section>

        <section className="mt-6 space-y-3">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.primary
                  ? "ucl-button-primary !mt-0 !h-auto !justify-start !px-5 !py-4 !text-left"
                  : "ucl-button-secondary !h-auto !justify-start !px-5 !py-4 !text-left"
              }
            >
              <span className="text-2xl" aria-hidden="true">
                {item.icon}
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-black">
                  {item.label}
                </span>
                <span
                  className={`mt-1 block text-xs font-semibold ${
                    item.primary ? "text-black/55" : "text-white/40"
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/registreren" className="ucl-button-secondary">
            📝 Registreren of inloggen
          </Link>

          <Link href="/admin-keuze" className="ucl-button-secondary">
            ⚙️ Admin
          </Link>
        </section>

        <button
          type="button"
          onClick={logout}
          className="ucl-button-danger mt-3"
        >
          🚪 Uitloggen
        </button>
      </div>
    </main>
  );
}
