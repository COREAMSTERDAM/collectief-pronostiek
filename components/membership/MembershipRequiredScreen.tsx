"use client";

import Link from "next/link";

type Props = {
  levelName: string;
  expiresAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function MembershipRequiredScreen({
  levelName,
  expiresAt,
}: Props) {
  const expiry = formatDate(expiresAt);

  return (
    <main className="membership-required-screen">
      <section className="membership-required-card">
        <div className="membership-required-icon" aria-hidden="true">
          🔒
        </div>

        <p className="membership-required-eyebrow">
          Collectief Wit en Zwet
        </p>

        <h1 className="membership-required-title">
          Deze functie hoort niet bij je huidige toegang
        </h1>

        <p className="membership-required-copy">
          Je bent momenteel aangemeld als <strong>{levelName}</strong>.
          {expiry ? <> Je huidige toegang loopt tot {expiry}.</> : null}
        </p>

        <div className="membership-required-actions">
          <Link href="/" className="membership-required-primary">
            Naar home
          </Link>

          <a
  href="https://collectiefwitenzwet.be/shop/"
  className="membership-required-secondary"
>
  Bekijk lidmaatschappen
</a>
        </div>
      </section>
    </main>
  );
}
