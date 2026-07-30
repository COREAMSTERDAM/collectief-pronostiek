"use client";

import { supabase } from "../src/lib/supabase";

export default function Home() {
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card">
          <img
            src="/logo.png"
            alt="Logo Collectief Pronostiek"
            className="ucl-logo"
          />

          <div className="text-center">
            <h1 className="ucl-title">
              Collectief Wit en Zwet
            </h1>

            <p className="ucl-subtitle">
              Voorspel de wedstrijden, verzamel punten en strijd om de eerste
              plaats.
            </p>
          </div>
        </section>

<div className="mt-6 space-y-4">
  <a
    href="/pronostiekpagina"
    className="ucl-button-primary"
  >
    ⚽ Pronostiek
  </a>

  <a
    href="/motmpagina"
    className="ucl-button-secondary"
  >
    ⭐ Man van de wedstrijd
  </a>

  <a
    href="/registreren"
    className="ucl-button-secondary"
  >
    📝 Registreren of Inloggen
  </a>

  <a
    href="/admin"
    className="ucl-button-secondary"
  >
    ⚙️ Admin
  </a>

  <button
    type="button"
    onClick={logout}
    className="ucl-button-danger"
  >
    🚪 Uitloggen
  </button>
</div>
      </div>
    </main>
  );
}