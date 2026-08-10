"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  is_admin: boolean | null;
  maintenance_access: boolean | null;
};

export default function OnderhoudAdminPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [title, setTitle] = useState("We zijn even bezig");
  const [message, setMessage] = useState(
    "De app is tijdelijk niet beschikbaar omdat we verbeteringen uitvoeren. Probeer het straks opnieuw."
  );
  const [logoUrl, setLogoUrl] = useState("/logo.png");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          window.location.href = "/login?reason=login-required";
          return;
        }

        const { data: ownProfile } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (!ownProfile?.is_admin) {
          throw new Error("Geen toegang tot onderhoudsbeheer.");
        }

        const [{ data: settings }, { data: profileRows }] = await Promise.all([
          supabase
            .from("app_settings")
            .select("maintenance_mode, maintenance_title, maintenance_message, maintenance_logo_url")
            .eq("id", 1)
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("id, name, email, is_admin, maintenance_access")
            .order("name", { ascending: true }),
        ]);

        if (!mounted) return;

        setMaintenanceMode(Boolean(settings?.maintenance_mode));
        setTitle(settings?.maintenance_title ?? "We zijn even bezig");
        setMessage(
          settings?.maintenance_message ??
            "De app is tijdelijk niet beschikbaar omdat we verbeteringen uitvoeren. Probeer het straks opnieuw."
        );
        setLogoUrl(settings?.maintenance_logo_url ?? "/logo.png");
        setUsers((profileRows ?? []) as UserRow[]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;

    return users.filter((user) =>
      `${user.name ?? ""} ${user.email ?? ""}`.toLowerCase().includes(q)
    );
  }, [search, users]);

  async function saveSettings() {
    setSaving(true);
    setNotice("");

    const { error } = await supabase
      .from("app_settings")
      .upsert({
        id: 1,
        maintenance_mode: maintenanceMode,
        maintenance_title: title.trim(),
        maintenance_message: message.trim(),
        maintenance_logo_url: logoUrl.trim() || null,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);
    setNotice(error ? error.message : "✅ Onderhoudsinstellingen opgeslagen.");
  }

  async function toggleAccess(user: UserRow) {
    if (user.is_admin) return;

    const next = !user.maintenance_access;

    const { error } = await supabase
      .from("profiles")
      .update({ maintenance_access: next })
      .eq("id", user.id);

    if (error) {
      setNotice(error.message);
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === user.id ? { ...item, maintenance_access: next } : item
      )
    );
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">Onderhoudsbeheer laden…</div>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-5xl">
        <Link href="/admin-keuze" className="text-sm font-black text-emerald-300">
          ← Terug naar beheer
        </Link>

        <section className="ucl-card mt-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/70">
            Systeem
          </p>

          <h1 className="ucl-title mt-2">Onderhoudsmodus</h1>

          <p className="ucl-subtitle">
            Zet de app tijdelijk op onderhoud, pas de boodschap aan en kies wie toch binnen mag.
          </p>

          <label className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div>
              <p className="font-black">Onderhoud actief</p>
              <p className="mt-1 text-xs text-white/45">
                Gewone gebruikers zien meteen de onderhoudspagina.
              </p>
            </div>

            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="h-6 w-6"
            />
          </label>

          <div className="mt-6 grid gap-5">
            <label>
              <span className="text-xs font-black uppercase tracking-wide text-white/40">
                Titel
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="ucl-input mt-2"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-white/40">
                Bericht
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="ucl-input mt-2 resize-none"
              />
            </label>

            <label>
              <span className="text-xs font-black uppercase tracking-wide text-white/40">
                Logo
              </span>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="/maintenance-logo.png"
                className="ucl-input mt-2"
              />
              <p className="mt-2 text-xs text-white/35">
                Plaats je logo in public en vul hier bijvoorbeeld /maintenance-logo.png in.
              </p>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving}
            className="ucl-button-primary mt-6 w-full disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Instellingen opslaan"}
          </button>
        </section>

        <section className="ucl-card mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                Toegang
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Gebruikers tijdens onderhoud
              </h2>
            </div>

            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200">
              Admins altijd toegestaan
            </span>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek gebruiker…"
            className="ucl-input mt-5"
          />

          <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            {filteredUsers.map((user) => {
              const enabled = Boolean(user.is_admin || user.maintenance_access);

              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-4 bg-white/[0.025] p-4"
                >
                  <div className="min-w-0">
                    <p className="font-black">{user.name || "Naamloos profiel"}</p>
                    <p className="mt-1 break-all text-xs text-white/40">
                      {user.email || "Geen e-mail"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(user.is_admin)}
                    onClick={() => void toggleAccess(user)}
                    className={[
                      "shrink-0 rounded-xl border px-3 py-2 text-xs font-black",
                      enabled
                        ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                        : "border-white/10 bg-white/[0.04] text-white/45",
                    ].join(" ")}
                  >
                    {user.is_admin ? "Admin" : enabled ? "Toegang aan" : "Geen toegang"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {notice ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold">
            {notice}
          </div>
        ) : null}
      </div>
    </main>
  );
}
