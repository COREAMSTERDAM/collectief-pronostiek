"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function WachtwoordResettenPage() {
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!password || !passwordRepeat) {
      alert("Vul beide velden in.");
      return;
    }

    if (password.length < 6) {
      alert("Het wachtwoord moet minstens 6 tekens bevatten.");
      return;
    }

    if (password !== passwordRepeat) {
      alert("De wachtwoorden komen niet overeen.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    alert("Je wachtwoord is aangepast. Je kunt nu inloggen.");
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
            <h1 className="ucl-title">
              Nieuw wachtwoord
            </h1>

            <p className="ucl-subtitle">
              Kies een nieuw wachtwoord voor je account.
            </p>
          </div>

          <form
            onSubmit={updatePassword}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Nieuw wachtwoord
              </label>

              <input
                id="new-password"
                type="password"
                placeholder="Minstens 6 tekens"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="ucl-input"
              />
            </div>

            <div>
              <label
                htmlFor="repeat-password"
                className="mb-2 block text-sm font-bold text-slate-200"
              >
                Herhaal wachtwoord
              </label>

              <input
                id="repeat-password"
                type="password"
                placeholder="Herhaal je nieuwe wachtwoord"
                value={passwordRepeat}
                onChange={(e) => setPasswordRepeat(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                className="ucl-input"
              />
            </div>

            <p className="text-xs text-slate-400">
              Gebruik minstens 6 tekens en kies bij voorkeur een uniek
              wachtwoord.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Wachtwoord aanpassen..."
                : "Wachtwoord aanpassen"}
            </button>
          </form>

          <a
            href="/login"
            className="ucl-button-secondary mt-3"
          >
            Terug naar inloggen
          </a>
        </section>
      </div>
    </main>
  );
}