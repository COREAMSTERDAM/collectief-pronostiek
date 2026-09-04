"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SupportershubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [unreadClubNews, setUnreadClubNews] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.replace("/login?reason=login-required");
        return;
      }

      try {
        const response = await fetch("/api/club-news/read", {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: "no-store",
        });
        if (response.ok) {
          const payload = await response.json();
          if (active) setUnreadClubNews(Number(payload.unread_count ?? 0));
        }
      } catch {
        // Teller mag de hub niet blokkeren.
      }

      if (active) setLoading(false);
    }

    void load();
    return () => { active = false; };
  }, [router]);

  if (loading) {
    return (
      <main className="supportershub-menu-page">
        <div className="supportershub-menu-loading">Supportershub laden…</div>
      </main>
    );
  }

  return (
    <main className="supportershub-menu-page">
      <header className="supportershub-menu-header">
        <div>
          <p>Collectief Wit en Zwet</p>
          <h1>Supportershub</h1>
        </div>
      </header>

      <section className="supportershub-menu-section">
        <div className="supportershub-menu-grid">
          <Link className="supportershub-menu-tile" href="/clubnieuws">
            <span className="supportershub-menu-icon">📰</span>
            <div><strong>Clubnieuws</strong></div>
            {unreadClubNews > 0 ? (
              <span className="supportershub-unread-badge" aria-label={`${unreadClubNews} ongelezen nieuwsartikels`}>
                {unreadClubNews > 99 ? "99+" : unreadClubNews}
              </span>
            ) : null}
            <span className="supportershub-menu-arrow">›</span>
          </Link>

          <Link className="supportershub-menu-tile" href="/club-vva">
            <span className="supportershub-menu-icon">🏆</span>
            <div><strong>2e Amateur VV A</strong></div>
            <span className="supportershub-menu-arrow">›</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
