import Link from "next/link";
import AdminNotificationBroadcast from "@/components/notifications/AdminNotificationBroadcast";

export default function AdminNotificationsPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-3xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300/70">
            Admin
          </p>

          <h1 className="ucl-title mt-3">
            Melding versturen
          </h1>

          <p className="ucl-subtitle">
            Stuur een in-app- en pushmelding naar iedereen of geselecteerde rollen.
          </p>
        </header>

        <div className="mt-6">
          <AdminNotificationBroadcast />
        </div>

        <div className="mt-6">
          <Link
            href="/admin-keuze"
            className="ucl-button-secondary"
          >
            ← Terug naar admin
          </Link>
        </div>
      </div>
    </main>
  );
}
