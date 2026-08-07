import Link from "next/link";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";

export default function NotificationSettingsPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-3xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300/70">
            Notification Center
          </p>

          <h1 className="ucl-title mt-3">
            Meldingsvoorkeuren
          </h1>

          <p className="ucl-subtitle">
            Kies per type melding of ze in de app en als push mag verschijnen.
          </p>
        </header>

        <div className="mt-6">
          <NotificationPreferences />
        </div>

        <div className="mt-6">
          <Link
            href="/meldingen"
            className="ucl-button-secondary"
          >
            ← Terug naar meldingen
          </Link>
        </div>
      </div>
    </main>
  );
}
