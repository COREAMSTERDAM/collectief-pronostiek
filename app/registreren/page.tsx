"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function RegistrerenPage() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [akkoord, setAkkoord] = useState(false);
  const [loading, setLoading] = useState(false);

  async function register(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!naam.trim() || !email.trim() || !wachtwoord) {
      alert("Vul alle velden in.");
      return;
    }

    if (!akkoord) {
      alert("Je moet akkoord gaan met het reglement.");
      return;
    }

    if (wachtwoord.length < 6) {
      alert("Het wachtwoord moet minstens 6 tekens bevatten.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: wachtwoord,
      options: {
        data: {
          name: naam.trim(),
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            name: naam.trim(),
            accepted_rules: true,
            accepted_rules_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          },
        );

      if (profileError) {
        alert(profileError.message);
        setLoading(false);
        return;
      }
    }

    window.location.href = "/login";
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
            <h1 className="ucl-title">Registreren</h1>

            <p className="ucl-subtitle">
              Maak een account aan en neem deel aan de pronostiek.
            </p>
          </div>

          <form onSubmit={register} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Naam
              </label>

              <input
                id="name"
                type="text"
                placeholder="Jouw naam"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                autoComplete="name"
                disabled={loading}
                className="ucl-input"
              />
            </div>

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

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Wachtwoord
              </label>

              <input
                id="password"
                type="password"
                placeholder="Minstens 6 tekens"
                value={wachtwoord}
                onChange={(e) => setWachtwoord(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="ucl-input"
              />

              <p className="mt-2 text-xs text-slate-400">
                Gebruik minstens 6 tekens.
              </p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <input
                type="checkbox"
                checked={akkoord}
                onChange={(e) => setAkkoord(e.target.checked)}
                disabled={loading}
                className="mt-1 h-4 w-4 shrink-0 accent-sky-500"
              />

              <span className="text-sm leading-6 text-slate-300">
                Ik ga akkoord met het reglement van Collectief Pronostiek.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Account aanmaken..." : "Registreren"}
            </button>
          </form>

          <div className="mt-5 border-t border-white/10 pt-5 text-center">
            <p className="text-sm text-slate-400">
              Heb je al een account?
            </p>

            <a
              href="/login"
              className="mt-3 inline-block font-bold text-sky-300 transition hover:text-sky-200"
            >
              Ga naar inloggen
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}