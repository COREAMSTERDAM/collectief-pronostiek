"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { MEMBERSHIP_ROUTES } from "@/src/lib/membership-routes";

type LevelKey = "guest" | "white_member" | "black_member";

type AccessRow = {
  membership_level_key: LevelKey;
  route_key: string;
  allowed: boolean;
};

type MembershipRow = {
  id: number;
  user_id: string;
  membership_level_key: LevelKey;
  source: string;
  starts_at: string;
  expires_at: string | null;
  wordpress_user_id: number | null;
  rua_level_title: string | null;
  active: boolean;
  last_synced_at: string | null;
};

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
  is_admin: boolean | null;
  wordpress_user_id: number | null;
};

type SyncRun = {
  id: number;
  mode: string;
  status: string;
  records: number;
  message: string | null;
  created_at: string;
};

const LEVELS: Array<{
  key: LevelKey;
  title: string;
  description: string;
}> = [
  {
    key: "guest",
    title: "Gast",
    description: "Automatisch voor nieuwe registraties in de app.",
  },
  {
    key: "white_member",
    title: "White Member",
    description: "White Member vanuit Restrict User Access.",
  },
  {
    key: "black_member",
    title: "Black Member",
    description: "Black Member vanuit Restrict User Access.",
  },
];

function formatDate(value: string | null) {
  if (!value) return "Onbeperkt";

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MembershipAdminPage() {
  const [accessRows, setAccessRows] = useState<AccessRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);
  const [syncRuns, setSyncRuns] = useState<SyncRun[]>([]);
  const [selectedLevel, setSelectedLevel] =
    useState<LevelKey>("white_member");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
        } = await supabase.auth.getUser();

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
          throw new Error("Je hebt geen toegang tot lidmaatschapsbeheer.");
        }

        const [
          accessResult,
          profileResult,
          membershipResult,
          syncResult,
        ] = await Promise.all([
          supabase
            .from("membership_route_access")
            .select("membership_level_key, route_key, allowed"),
          supabase
            .from("profiles")
            .select("id, name, email, is_admin, wordpress_user_id")
            .order("name", { ascending: true }),
          supabase
            .from("user_memberships")
            .select(
              "id, user_id, membership_level_key, source, starts_at, expires_at, wordpress_user_id, rua_level_title, active, last_synced_at",
            )
            .order("updated_at", { ascending: false }),
          supabase
            .from("membership_sync_runs")
            .select("id, mode, status, records, message, created_at")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

        if (accessResult.error) {
          throw new Error(
            `Rechten laden mislukt: ${accessResult.error.message}`,
          );
        }

        if (profileResult.error) {
          throw new Error(
            `Profielen laden mislukt: ${profileResult.error.message}`,
          );
        }

        if (membershipResult.error) {
          throw new Error(
            `Lidmaatschappen laden mislukt: ${membershipResult.error.message}`,
          );
        }

        if (syncResult.error) {
          throw new Error(
            `Synchronisaties laden mislukt: ${syncResult.error.message}`,
          );
        }

        if (!mounted) return;

        setAccessRows((accessResult.data ?? []) as AccessRow[]);
        setProfiles((profileResult.data ?? []) as ProfileRow[]);
        setMemberships((membershipResult.data ?? []) as MembershipRow[]);
        setSyncRuns((syncResult.data ?? []) as SyncRun[]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Lidmaatschapsbeheer kon niet worden geladen.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedAccess = useMemo(() => {
    const map = new Map<string, boolean>();

    for (const row of accessRows) {
      if (row.membership_level_key === selectedLevel) {
        map.set(row.route_key, row.allowed);
      }
    }

    return map;
  }, [accessRows, selectedLevel]);

  const effectiveByUser = useMemo(() => {
    const now = Date.now();
    const priority: Record<LevelKey, number> = {
      guest: 0,
      white_member: 10,
      black_member: 20,
    };

    const result = new Map<string, MembershipRow>();

    for (const membership of memberships) {
      if (!membership.active) continue;

      if (
        membership.expires_at &&
        new Date(membership.expires_at).getTime() <= now
      ) {
        continue;
      }

      const current = result.get(membership.user_id);

      if (
        !current ||
        priority[membership.membership_level_key] >
          priority[current.membership_level_key]
      ) {
        result.set(membership.user_id, membership);
      }
    }

    return result;
  }, [memberships]);

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return profiles;

    return profiles.filter((profile) =>
      `${profile.name ?? ""} ${profile.email ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [profiles, search]);

  function toggleRoute(routeKey: string) {
    setAccessRows((current) => {
      const existing = current.find(
        (row) =>
          row.membership_level_key === selectedLevel &&
          row.route_key === routeKey,
      );

      if (existing) {
        return current.map((row) =>
          row === existing
            ? { ...row, allowed: !row.allowed }
            : row,
        );
      }

      return [
        ...current,
        {
          membership_level_key: selectedLevel,
          route_key: routeKey,
          allowed: true,
        },
      ];
    });
  }

  async function saveAccess() {
    try {
      setSaving(true);
      setMessage("");
      setErrorMessage("");

      const rows = MEMBERSHIP_ROUTES.map((route) => ({
        membership_level_key: selectedLevel,
        route_key: route.key,
        allowed: Boolean(selectedAccess.get(route.key)),
      }));

      const { error } = await supabase
        .from("membership_route_access")
        .upsert(rows, {
          onConflict: "membership_level_key,route_key",
        });

      if (error) throw error;

      setMessage(`✅ Rechten voor ${LEVELS.find((x) => x.key === selectedLevel)?.title} opgeslagen.`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Opslaan is mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container !max-w-6xl">
          <div className="ucl-card text-center">
            Lidmaatschappen laden…
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <Link
          href="/admin-keuze"
          className="text-sm font-black text-emerald-300"
        >
          ← Terug naar beheer
        </Link>

        <section className="ucl-card mt-5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300/70">
            Toegangsbeheer
          </p>
          <h1 className="ucl-title mt-2">Lidmaatschappen</h1>
          <p className="ucl-subtitle">
            Beheer welke onderdelen Gast, White Member en Black Member mogen openen.
            WordPress blijft de bron voor betaalde memberships.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {LEVELS.map((level) => (
              <button
                key={level.key}
                type="button"
                onClick={() => setSelectedLevel(level.key)}
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  selectedLevel === level.key
                    ? "border-emerald-300/30 bg-emerald-300/10"
                    : "border-white/10 bg-white/[0.035]",
                ].join(" ")}
              >
                <p className="font-black">{level.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/40">
                  {level.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3">
            {MEMBERSHIP_ROUTES.map((route) => {
              const allowed = Boolean(selectedAccess.get(route.key));

              return (
                <button
                  key={route.key}
                  type="button"
                  onClick={() => toggleRoute(route.key)}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left"
                >
                  <div>
                    <p className="font-black">{route.title}</p>
                    <p className="mt-1 text-xs leading-5 text-white/40">
                      {route.description}
                    </p>
                  </div>

                  <span
                    className={[
                      "shrink-0 rounded-full px-3 py-1 text-xs font-black",
                      allowed
                        ? "bg-emerald-300/10 text-emerald-200"
                        : "bg-white/[0.05] text-white/35",
                    ].join(" ")}
                  >
                    {allowed ? "Toegang" : "Geblokkeerd"}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void saveAccess()}
            disabled={saving}
            className="ucl-button-primary mt-6 w-full disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Rechten opslaan"}
          </button>
        </section>

        <section className="ucl-card mt-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                Synchronisatie
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Restrict User Access
              </h2>
            </div>

            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200">
              Automatisch
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {syncRuns.length === 0 ? (
              <p className="text-sm text-white/40">
                Nog geen synchronisaties geregistreerd.
              </p>
            ) : (
              syncRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-black">
                      {run.mode === "full" ? "Volledige sync" : "Gebruikerssync"}
                    </p>
                    <span
                      className={
                        run.status === "success"
                          ? "text-xs font-black text-emerald-200"
                          : "text-xs font-black text-red-200"
                      }
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    {formatDate(run.created_at)} · {run.records} record(s)
                  </p>
                  {run.message ? (
                    <p className="mt-2 text-xs leading-5 text-white/55">
                      {run.message}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="ucl-card mt-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
            Gebruikers
          </p>
          <h2 className="mt-1 text-2xl font-black">
            Actuele app-toegang
          </h2>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op naam of e-mail…"
            className="ucl-input mt-5"
          />

          <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
            {filteredProfiles.map((profile) => {
              const membership = effectiveByUser.get(profile.id);

              return (
                <div
                  key={profile.id}
                  className="grid gap-3 bg-white/[0.025] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div>
                    <p className="font-black">
                      {profile.name || "Naamloos profiel"}
                    </p>
                    <p className="mt-1 break-all text-xs text-white/40">
                      {profile.email || "Geen e-mail"}
                    </p>
                    {profile.wordpress_user_id ? (
                      <p className="mt-1 text-xs text-white/30">
                        WordPress #{profile.wordpress_user_id}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:text-right">
                    {profile.is_admin ? (
                      <span className="text-xs font-black text-emerald-200">
                        Admin · volledige toegang
                      </span>
                    ) : (
                      <>
                        <p className="text-sm font-black">
                          {membership?.membership_level_key === "black_member"
                            ? "Black Member"
                            : membership?.membership_level_key === "white_member"
                              ? "White Member"
                              : "Gast"}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          {membership?.expires_at
                            ? `Tot ${formatDate(membership.expires_at)}`
                            : "Onbeperkt / fallback"}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
            {message}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-bold text-red-100">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </main>
  );
}