import Link from "next/link";

export default function ManVanDeWedstrijdPage() {
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
            <h1 className="ucl-title">Man van de wedstrijd</h1>

            <p className="ucl-subtitle">
              Stem op de uitblinker, bekijk de resultaten en volg het
              seizoensklassement.
            </p>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          <Link
            href="/man-van-de-wedstrijd/stemmen"
            className="ucl-button-primary"
          >
            🗳️ Stemmen
          </Link>

          <Link
            href="/man-van-de-wedstrijd/uitslagen"
            className="ucl-button-secondary"
          >
            📊 Uitslagen per wedstrijd
          </Link>

          <Link
            href="/speler-van-het-seizoen"
            className="ucl-button-secondary"
          >
            🏆 Speler van het seizoen
          </Link>

          <Link href="/" className="ucl-button-secondary">
            ⬅️ Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}