export default function PronostiekPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <section className="ucl-card">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-300">
              Collectief Wit en Zwet
            </p>

            <h1 className="ucl-title mt-2">
              Pronostiek
            </h1>

            <p className="ucl-subtitle">
              Voorspel wedstrijden, bekijk je pronostieken en volg het
              klassement.
            </p>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          <a
            href="/wedstrijden"
            className="ucl-button-primary"
          >
            ⚽ Wedstrijden
          </a>

          <a
            href="/mijn-pronostieken"
            className="ucl-button-secondary"
          >
            📝 Mijn pronostieken
          </a>

          <a
            href="/klassement"
            className="ucl-button-secondary"
          >
            🏆 Klassement
          </a>

          <a
            href="/"
            className="ucl-button-secondary"
          >
            ← Terug naar dashboard
          </a>
        </div>
      </div>
    </main>
  );
}