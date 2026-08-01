import Link from "next/link";

export default function IedereenCoachKeuzePage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Iedereen Coach
          </p>

          <h1 className="ucl-title mt-3">
            Maak je keuze
          </h1>

          <p className="ucl-subtitle">
            Stel een nieuwe basiself samen of bekijk je eerdere
            opstellingen.
          </p>
        </section>

        <section className="mt-6 space-y-4">
          <Link
            href="/iedereen-coach"
            className="ucl-card block transition hover:-translate-y-1"
          >
            <div className="text-center">
              <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-amber-200">
                ⚽ Nieuwe opstelling
              </span>

              <h2 className="mt-5 text-2xl font-black text-white">
                Elftal indienen
              </h2>

              <p className="mt-2 font-semibold text-white/55">
                Kies een open wedstrijd en stel jouw ideale basiself samen.
              </p>

              <div className="ucl-button-primary mt-5">
                Elftal indienen
              </div>
            </div>
          </Link>

          <Link
            href="/iedereen-coach/mijn-opstellingen"
            className="ucl-card block transition hover:-translate-y-1"
          >
            <div className="text-center">
              <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-white/60">
                📚 Historiek
              </span>

              <h2 className="mt-5 text-2xl font-black text-white">
                Mijn vorige opstellingen
              </h2>

              <p className="mt-2 font-semibold text-white/55">
                Bekijk je opgeslagen basiselftallen van gesloten
                wedstrijden.
              </p>

              <div className="ucl-button-secondary mt-5">
                Mijn vorige opstellingen
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
