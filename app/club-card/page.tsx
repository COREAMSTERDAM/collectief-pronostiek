"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type BalanceResponse = {
  balance: {
    formatted: string;
    amount: number;
    currency: "EUR";
  };
  fetched_at: string;
  source: "eventpay";
};

type ApiError = {
  error?: string;
  code?: string;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export default function ClubCardPage() {
  const [data, setData] =
    useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [missingCard, setMissingCard] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadBalance = useCallback(
    async (manualRefresh = false) => {
      try {
        if (manualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");
        setMissingCard(false);

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          window.location.href =
            "/login?reason=login-required";
          return;
        }

        const response = await fetch(
          "/api/club-card/balance",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${session.access_token}`,
            },
          },
        );

        const payload =
          (await response.json()) as
            | BalanceResponse
            | ApiError;

        if (!response.ok) {
          const apiError = payload as ApiError;

          if (
            response.status === 404 &&
            apiError.code === "CLUB_CARD_NOT_FOUND"
          ) {
            setMissingCard(true);
          }

          throw new Error(
            apiError.error ??
              "Het saldo kon niet worden opgehaald.",
          );
        }

        setData(payload as BalanceResponse);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Het saldo kon niet worden opgehaald.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-3xl">
        <header className="ucl-card overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-amber-300/25 bg-amber-400/10 text-3xl shadow-xl shadow-black/20">
              💳
            </div>

            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
                Mijn Club Card
              </p>

              <h1 className="ucl-title mt-2">
                Actueel saldo
              </h1>

              <p className="ucl-subtitle max-w-2xl">
                Je saldo wordt automatisch bij EventPay
                opgevraagd wanneer je deze pagina opent.
              </p>
            </div>
          </div>
        </header>

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <div className="mx-auto flex h-16 w-16 animate-pulse items-center justify-center rounded-full border border-amber-300/20 bg-amber-400/10 text-3xl">
              €
            </div>

            <h2 className="mt-5 text-xl font-black text-white">
              Saldo ophalen…
            </h2>

            <p className="ucl-muted mt-2">
              Even geduld terwijl EventPay wordt geraadpleegd.
            </p>
          </section>
        ) : data ? (
          <>
            <section className="mt-6 overflow-hidden rounded-[2rem] border border-amber-300/25 bg-gradient-to-br from-amber-300/15 via-white/[0.05] to-black p-6 shadow-2xl shadow-black/30 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-100/60">
                    Current balance
                  </p>

                  <p className="mt-3 text-5xl font-black tabular-nums text-white sm:text-6xl">
                    {data.balance.formatted}
                  </p>
                </div>

                <span className="inline-flex items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200">
                  ● Live opgehaald
                </span>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="text-xs font-semibold text-white/35">
                  Laatst opgehaald
                </p>

                <p className="mt-1 text-sm font-black text-white/70">
                  {formatUpdatedAt(data.fetched_at)}
                </p>
              </div>
            </section>

            <button
              type="button"
              onClick={() => void loadBalance(true)}
              disabled={refreshing}
              className="ucl-button-primary w-full disabled:cursor-not-allowed disabled:opacity-40"
            >
              {refreshing
                ? "Saldo vernieuwen…"
                : "↻ Saldo vernieuwen"}
            </button>
          </>
        ) : (
          <section className="ucl-card mt-6 text-center">
            <div className="text-4xl">
              {missingCard ? "💳" : "⚠️"}
            </div>

            <h2 className="mt-4 text-xl font-black text-white">
              {missingCard
                ? "Nog geen Club Card gekoppeld"
                : "Saldo niet beschikbaar"}
            </h2>

            <p className="ucl-subtitle mx-auto max-w-xl">
              {errorMessage}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {missingCard ? (
                <Link
                  href="/profiel"
                  className="ucl-button-primary !mt-0"
                >
                  Club Card toevoegen
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void loadBalance(true)}
                  disabled={refreshing}
                  className="ucl-button-primary !mt-0 disabled:opacity-40"
                >
                  Opnieuw proberen
                </button>
              )}

              <Link
                href="/profiel"
                className="ucl-button-secondary"
              >
                Naar mijn profiel
              </Link>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs leading-5 text-white/40">
            Het saldo wordt rechtstreeks van de persoonlijke
            EventPay-walletpagina opgehaald en niet permanent in
            deze app opgeslagen. EventPay vermeldt dat weergegeven
            transactiedata enige vertraging kan hebben.
          </p>
        </section>

        <div className="mt-6">
          <Link
            href="/profiel"
            className="ucl-button-secondary"
          >
            ← Terug naar mijn profiel
          </Link>
        </div>
      </div>
    </main>
  );
}
