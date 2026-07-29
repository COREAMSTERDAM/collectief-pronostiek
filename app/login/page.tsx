"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: wachtwoord,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <div className="ucl-card">
          <img
            src="/logo.png"
            alt="Collectief Pronostiek"
            className="ucl-logo"
          />

          <div className="text-center mb-6">
            <h1 className="ucl-title">
              Collectief Pronostiek
            </h1>

            <p className="ucl-subtitle">
              Log in en voorspel de wedstrijden.
            </p>
          </div>

          <form
            onSubmit={login}
            className="space-y-4"
          >
            <input
              type="email"
              placeholder="E-mailadres"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ucl-input"
            />

            <input
              type="password"
              placeholder="Wachtwoord"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              className="ucl-input"
            />

            <button
              type="submit"
              className="ucl-button-primary"
            >
              Inloggen
            </button>
          </form>

          <a
            href="/wachtwoord-vergeten"
            className="block mt-5 text-center text-sky-300 hover:text-sky-200"
          >
            Wachtwoord vergeten?
          </a>
        </div>
      </div>
    </main>
  );
}