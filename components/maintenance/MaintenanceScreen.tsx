"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  title?: string;
  message?: string;
  logoUrl?: string | null;
};

export default function MaintenanceScreen({
  title = "We zijn even bezig",
  message = "De app is tijdelijk niet beschikbaar omdat we verbeteringen uitvoeren. Probeer het straks opnieuw.",
  logoUrl = "/logo.png",
}: Props) {
  return (
    <main className="maintenance-screen">
      <div className="maintenance-glow maintenance-glow-a" />
      <div className="maintenance-glow maintenance-glow-b" />

      <section className="maintenance-panel">
        <div className="maintenance-logo-wrap">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Collectief Wit en Zwet"
              fill
              priority
              sizes="120px"
              className="maintenance-logo"
            />
          ) : (
            <div className="maintenance-logo-fallback">CWZ</div>
          )}
        </div>

        <div className="maintenance-status">
          <span className="maintenance-status-dot" />
          Onderhoudsmodus actief
        </div>

        <p className="maintenance-eyebrow">Collectief Wit en Zwet</p>
        <h1 className="maintenance-title">{title}</h1>
        <p className="maintenance-message">{message}</p>

        <div className="maintenance-info">
          <span aria-hidden="true">🔧</span>
          <div>
            <strong>We werken aan de app</strong>
            <p>
              Sommige onderdelen zijn tijdelijk niet beschikbaar.
              Beheerders en toegelaten testers kunnen wel verder.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="maintenance-primary-button"
        >
          Opnieuw proberen <span aria-hidden="true">↻</span>
        </button>

        <Link href="/login" className="maintenance-secondary-button">
          Beheerder of tester? <span>Inloggen</span>
        </Link>

        <p className="maintenance-footer">Bedankt voor je geduld.</p>
      </section>
    </main>
  );
}
