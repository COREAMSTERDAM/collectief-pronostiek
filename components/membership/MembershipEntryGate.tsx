"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

const ACK_KEY = "cwz-membership-intro-accepted";
const SHOP_URL = "https://collectiefwitenzwet.be/shop/";

export default function MembershipEntryGate({
  children,
}: {
  children: ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        // Wie al ingelogd is, hoeft de melding niet opnieuw te zien.
        if (user) {
          setShowIntro(false);
          return;
        }

        // Binnen dezelfde browser/tab-sessie tonen we de melding maar één keer.
        const accepted =
          window.sessionStorage.getItem(ACK_KEY) === "1";

        setShowIntro(!accepted);
      } finally {
        if (mounted) setChecking(false);
      }
    }

    void check();

    return () => {
      mounted = false;
    };
  }, []);

  function continueToLogin() {
    window.sessionStorage.setItem(ACK_KEY, "1");
    setShowIntro(false);
  }

  if (checking) {
    return (
      <div className="min-h-[100dvh] bg-black" aria-hidden="true" />
    );
  }

  return (
    <>
      {children}

      {showIntro ? (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/85 p-3 backdrop-blur-md sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="membership-intro-title"
          aria-describedby="membership-intro-description"
        >
          <section className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/70">
            <div className="border-b border-white/10 bg-gradient-to-br from-emerald-400/15 via-white/[0.035] to-transparent px-5 pb-5 pt-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-2xl">
                <span aria-hidden="true">🔓</span>
              </div>

              <div className="mt-4 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300/70">
                  Collectief Wit &amp; Zwet
                </p>

                <h1
                  id="membership-intro-title"
                  className="mt-2 text-2xl font-black tracking-tight text-white"
                >
                  Niet alle functies zijn beschikbaar als gast
                </h1>

                <p
                  id="membership-intro-description"
                  className="mx-auto mt-3 max-w-sm text-sm font-medium leading-6 text-white/55"
                >
                  Je kunt de app als gast gebruiken, maar bepaalde onderdelen
                  zijn alleen beschikbaar voor White Members en Black Members.
                  Met een lidmaatschap krijg je toegang tot de functies die bij
                  jouw membership horen.
                </p>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <a
                href={SHOP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 text-center text-sm font-black text-black transition active:scale-[0.98]"
              >
                <span aria-hidden="true">🎟️</span>
                Lidmaatschap afsluiten
              </a>

              <button
                type="button"
                onClick={continueToLogin}
                className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-white/12 bg-white/[0.055] px-5 py-3 text-sm font-black text-white transition active:scale-[0.98]"
              >
                Doorgaan
              </button>

              <p className="px-2 pt-1 text-center text-xs font-medium leading-5 text-white/35">
                Heb je al een lidmaatschap? Kies dan
                <span className="font-bold text-white/60"> Doorgaan </span>
                en meld je aan met je bestaande account.
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
