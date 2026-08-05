import Link from "next/link";
import CommunityPushSettings from "@/components/community/CommunityPushSettings";

export default function CommunityNotificationsPage() {
  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-3xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-green-300/70">
            Community
          </p>

          <h1 className="ucl-title mt-3">
            Meldingsinstellingen
          </h1>

          <p className="ucl-subtitle">
            Beheer pushmeldingen voor alle communitykanalen.
          </p>
        </header>

        <div className="mt-6">
          <CommunityPushSettings />
        </div>

        <div className="mt-6">
          <Link
            href="/community"
            className="ucl-button-secondary"
          >
            ← Terug naar community
          </Link>
        </div>
      </div>
    </main>
  );
}
