export default function PronostiekPage() {
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
              Kies wat je wilt doen binnen de pronostiek.
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
            ⬅️ Terug naar dashboard
          </a>
        </div>
      </div>
    </main>
  );
}