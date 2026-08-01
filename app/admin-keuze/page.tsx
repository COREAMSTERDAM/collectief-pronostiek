import Link from "next/link";

export default function AdminKeuzePage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card text-center">
          <img
            src="/logo.png"
            alt="Logo Collectief Pronostiek"
            className="ucl-logo"
          />

          <h1 className="ucl-title">Admin</h1>

          <p className="ucl-subtitle">
            Kies welke gegevens je wilt beheren.
          </p>
        </section>

        <section className="mt-6 space-y-4">

          {/* Gebruikersbeheer */}
          <Link
            href="/admin/gebruikers"
            className="ucl-card block transition hover:-translate-y-1"
          >
            <div className="text-center">
              <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-emerald-200">
                👥 Gebruikers
              </span>

              <h2 className="mt-5 text-2xl font-black text-white">
                Gebruikersbeheer
              </h2>

              <p className="mt-2 font-semibold text-white/55">
                Beheer gebruikers, wijzig namen en e-mailadressen en verstuur
                wachtwoord-resetmails.
              </p>

              <div className="ucl-button-primary mt-5">
                Open gebruikersbeheer
              </div>
            </div>
          </Link>

          {/* Pronostiek */}
          <Link
            href="/admin"
            className="ucl-card block transition hover:-translate-y-1"
          >
            <div className="text-center">
              <span className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-sky-200">
                🔵 Pronostiek
              </span>

              <h2 className="mt-5 text-2xl font-black text-white">
                Pronostiek data
              </h2>

              <p className="mt-2 font-semibold text-white/55">
                Beheer wedstrijden, pronostieken en klassementgegevens.
              </p>

              <div className="ucl-button-primary mt-5">
                Open Pronostiek data
              </div>
            </div>
          </Link>

          {/* Man van de wedstrijd */}
          <Link
            href="/admin/spelers"
            className="ucl-card block transition hover:-translate-y-1"
          >
            <div className="text-center">
              <span className="inline-flex rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-purple-200">
                🟣 Man van de wedstrijd
              </span>

              <h2 className="mt-5 text-2xl font-black text-white">
                Man van de wedstrijd data
              </h2>

              <p className="mt-2 font-semibold text-white/55">
                Beheer spelers en gegevens voor Man van de wedstrijd.
              </p>

              <div className="ucl-button-secondary mt-5">
                Open Man van de wedstrijd data
              </div>
            </div>
          </Link>

          {/* Iedereen Coach */}
          <Link
            href="/admin/coach-wedstrijden"
            className="ucl-card block transition hover:-translate-y-1"
          >
            <div className="text-center">
              <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-amber-200">
                ⚽ Iedereen Coach
              </span>

              <h2 className="mt-5 text-2xl font-black text-white">
                Iedereen Coach data
              </h2>

              <p className="mt-2 font-semibold text-white/55">
                Beheer actieve spelers, beoordelingsdeadlines en finaliseer
                spelersbeoordelingen.
              </p>

              <div className="ucl-button-secondary mt-5">
                Open Iedereen Coach admin
              </div>
            </div>
          </Link>

        </section>

        <div className="mt-6">
          <Link href="/" className="ucl-button-secondary">
            🏠 Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}