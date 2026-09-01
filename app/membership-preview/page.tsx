"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Membership = {
  membership_level_key: "guest" | "white_member" | "black_member";
  source: string | null;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean | null;
};

function label(level: Membership["membership_level_key"]) {
  if (level === "black_member") return "Black Member";
  if (level === "white_member") return "White Member";
  return "Gast";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("nl-BE", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(value));
}

export default function MembershipPreviewPage() {
  const router = useRouter();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login?reason=login-required"); return; }

      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!profile?.is_admin) { router.replace("/"); return; }

      const { data } = await supabase
        .from("user_memberships")
        .select("membership_level_key, source, starts_at, expires_at, active")
        .eq("user_id", user.id)
        .eq("active", true)
        .order("starts_at", { ascending: false });

      if (!active) return;
      const rows = (data ?? []) as Membership[];
      const manual = rows.find((row) => row.source === "admin_manual");
      const black = rows.find((row) => row.membership_level_key === "black_member");
      const white = rows.find((row) => row.membership_level_key === "white_member");
      setMembership(manual ?? black ?? white ?? null);
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [router]);

  const current = useMemo<Membership>(() => membership ?? ({
    membership_level_key: "guest",
    source: "fallback",
    starts_at: null,
    expires_at: null,
    active: true,
  }), [membership]);

  if (loading) return <main className="supportershub-menu-page"><div className="supportershub-menu-loading">Membership laden…</div></main>;

  return (
    <main className="supportershub-menu-page">
      <header className="supportershub-menu-header">
        <Link href="/supportershub-preview" className="supportershub-menu-back" aria-label="Terug">‹</Link>
        <div><p>Mijn Collectief</p><h1>Membership</h1><span>Mijn huidige lidmaatschap.</span></div>
      </header>

      <section className="supportershub-menu-section">
        <div className="supportershub-menu-tile" style={{ cursor: "default" }}>
          <span className="supportershub-menu-icon">🎫</span>
          <div><strong>{label(current.membership_level_key)}</strong><small>{current.active ? "Actief lidmaatschap" : "Niet actief"}</small></div>
        </div>
      </section>

      <section className="supportershub-menu-section">
        <h2>Details</h2>
        <div className="supportershub-menu-grid">
          <div className="supportershub-menu-tile is-disabled"><span className="supportershub-menu-icon">📅</span><div><strong>Startdatum</strong><small>{formatDate(current.starts_at)}</small></div></div>
          <div className="supportershub-menu-tile is-disabled"><span className="supportershub-menu-icon">⌛</span><div><strong>Geldig tot</strong><small>{formatDate(current.expires_at)}</small></div></div>
        </div>
      </section>
    </main>
  );
}
