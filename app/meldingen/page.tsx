import Link from "next/link";
import NotificationCenter from "@/components/notifications/NotificationCenter";

export default function NotificationsPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-3xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-green-300/70">
            Activity Center
          </p>
          <h1 className="ucl-title mt-3">Meldingen</h1>
          <p className="ucl-subtitle">
            Alle community- en appmeldingen op één centrale plaats.
          </p>
        </header>

        <div className="mt-6">
          <NotificationCenter />
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/community/meldingen" className="ucl-button-secondary">
            Pushinstellingen
          </Link>
          <Link href="/" className="ucl-button-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
