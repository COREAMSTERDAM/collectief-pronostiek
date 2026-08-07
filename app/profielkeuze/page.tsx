import Link from "next/link";

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
          <Link
            href="/profiel"
            className="native-tile flex min-h-[7rem] flex-col items-center justify-center gap-2 px-3 py-4 text-center"
          >
            <span className="text-2xl" aria-hidden="true">👤</span>
            <span className="w-full whitespace-normal break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere]">
              Mijn profiel
            </span>
          </Link>

          <Link
            href="/mijn-pronostieken"
            className="native-tile flex min-h-[7rem] flex-col items-center justify-center gap-2 px-3 py-4 text-center"
          >
            <span className="text-2xl" aria-hidden="true">📜</span>
            <span className="w-full whitespace-normal break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere]">
              Mijn voorspellingen
            </span>
          </Link>

          <Link
            href="/iedereen-coach/mijn-opstellingen"
            className="native-tile flex min-h-[7rem] flex-col items-center justify-center gap-2 px-3 py-4 text-center"
          >
            <span className="text-2xl" aria-hidden="true">⚽</span>
            <span className="w-full whitespace-normal break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere]">
              Mijn opstellingen
            </span>
          </Link>

          <Link
            href="/klassement"
            className="native-tile flex min-h-[7rem] flex-col items-center justify-center gap-2 px-3 py-4 text-center"
          >
            <span className="text-2xl" aria-hidden="true">🏆</span>
            <span className="w-full whitespace-normal break-words text-sm font-black leading-tight text-white [overflow-wrap:anywhere]">
              Mijn positie
            </span>
          </Link>
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