import Link from "next/link";
import NativeTile from "@/components/native/NativeTile";

export default function ProfielKeuzePage() {
  return (
    <div className="native-screen native-home-screen native-home-compact">
      <header className="native-home-header">
        <div className="min-w-0">
          <p className="native-home-greeting">
            Mijn account
          </p>

          <h1 className="native-home-name">
            Profiel en prestaties
          </h1>

          <p className="mt-1 text-sm font-semibold text-white/45">
            Bekijk je persoonlijke gegevens en resultaten.
          </p>
        </div>

        <Link
          href="/"
          className="native-profile-logo"
          aria-label="Terug naar home"
        >
          <img src="/logo.png" alt="" />
        </Link>
      </header>

      <section className="native-home-section native-home-section-compact">
        <div className="native-quick-grid">
          <NativeTile
            href="/profiel"
            title="Mijn profiel"
            icon="👤"
          />

          <NativeTile
            href="/mijn-pronostieken"
            title="Mijn voorspellingen"
            icon="📜"
          />

          <NativeTile
            href="/iedereen-coach/mijn-opstellingen"
            title="Mijn opstellingen"
            icon="⚽"
          />

          <NativeTile
            href="/klassement"
            title="Mijn positie"
            icon="🏆"
          />
        </div>
      </section>

      <section className="native-home-compact-actions">
        <Link
          href="/"
          className="native-home-action-pill"
        >
          <span>←</span>
          <span>Home</span>
        </Link>
      </section>
    </div>
  );
}