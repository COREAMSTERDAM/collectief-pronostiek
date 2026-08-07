"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendResetEmail(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!email.trim()) {
      alert("Vul je e-mailadres in.");
      return;
    }

    setLoading(true);

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/wachtwoord-resetten`,
        }
      );

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert(
      "Controleer je mailbox. Je ontvangt een link om je wachtwoord opnieuw in te stellen."
    );

    setLoading(false);
    setEmail("");
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card">
          <img
            src="/logo.png"
            alt="Collectief Pronostiek"
            className="ucl-logo"
          />

          <div className="mb-6 text-center">
            <h1 className="ucl-title">
              Wachtwoord vergeten
            </h1>

            <p className="ucl-subtitle">
              Geef je e-mailadres op. We sturen je een link
              waarmee je een nieuw wachtwoord kunt instellen.
            </p>
          </div>

          <form
            onSubmit={sendResetEmail}
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
                placeholder="naam@voorbeeld.be"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
                className="ucl-input"
              />
            </div>

            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-slate-300">
                Na het openen van de link in de e-mail kun je
                direct een nieuw wachtwoord kiezen.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Resetlink versturen..."
                : "Resetlink versturen"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-5 text-center">
            <p className="text-sm text-slate-400">
              Weet je je wachtwoord toch nog?
            </p>

            <a
              href="/login"
              className="mt-3 inline-block font-bold text-emerald-300 transition hover:text-emerald-200"
            >
              Terug naar inloggen
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}