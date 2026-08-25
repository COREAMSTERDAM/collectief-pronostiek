"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase";
import MembershipEntryGate from "@/components/membership/MembershipEntryGate";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReason(params.get("reason") || "");
  }, []);

  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setErrorMessage("");

    if (!email.trim() || !wachtwoord) {
      setErrorMessage("Vul je e-mailadres en wachtwoord in.");
      return;
    }

    setIsLoggingIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: wachtwoord,
    });

    if (error) {
      setIsLoggingIn(false);

      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setErrorMessage("Het e-mailadres of wachtwoord is niet correct.");
        return;
      }

      if (error.message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage(
          "Je e-mailadres is nog niet bevestigd. Controleer je inbox."
        );
        return;
      }

      setErrorMessage(
        "Inloggen is momenteel niet gelukt. Probeer het opnieuw."
      );
      return;
    }

    window.location.href = "/";
  }

  return (
    <MembershipEntryGate>
      <main className="ucl-page">
      <div className="ucl-container">
        <div className="ucl-card">
          <img
            src="/logo.png"
            alt="Collectief Pronostiek"
            className="ucl-logo"
          />

          <div className="mb-6 text-center">
            <h1 className="ucl-title">
              Collectief Pronostiek
            </h1>

            <p className="ucl-subtitle">
              Log in en voorspel de wedstrijden.
            </p>
          </div>

          {reason === "login-required" && (
            <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p className="font-bold text-emerald-300">
                🔒 Je bent niet ingelogd.
              </p>

              <p className="mt-1 text-sm text-slate-300">
                Meld je aan om deze pagina te bekijken.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4"
            >
              <p className="font-bold text-rose-300">
                Inloggen mislukt
              </p>

              <p className="mt-1 text-sm text-slate-300">
                {errorMessage}
              </p>
            </div>
          )}

          <form
            onSubmit={login}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                E-mailadres
              </label>

              <input
                id="email"
                type="email"
                placeholder="E-mailadres"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="ucl-input"
                autoComplete="email"
                required
                disabled={isLoggingIn}
              />
            </div>

            <div>
              <label
                htmlFor="wachtwoord"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Wachtwoord
              </label>

              <input
                id="wachtwoord"
                type="password"
                placeholder="Wachtwoord"
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                className="ucl-input"
                autoComplete="current-password"
                required
                disabled={isLoggingIn}
              />
            </div>

            <button
              type="submit"
              className="ucl-button-primary"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Bezig met inloggen..." : "Inloggen"}
            </button>
          </form>

          <a
            href="/wachtwoord-vergeten"
            className="mt-5 block text-center text-emerald-300 hover:text-emerald-200"
          >
            Wachtwoord vergeten?
          </a>

          <div className="mt-8 flex justify-center">
            <a
              href="/"
              className="ucl-button-secondary"
            >
              ← Terug naar dashboard
            </a>
          </div>
        </div>
      </div>
      </main>
    </MembershipEntryGate>
  );
}