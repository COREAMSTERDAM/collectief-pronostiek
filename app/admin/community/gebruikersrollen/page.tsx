"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCommunityRoles, type CommunityRole } from "@/src/lib/community";
import { setUserCommunityRoles } from "@/src/lib/community-admin";
import { supabase } from "@/src/lib/supabase";

type CommunityUser = {
  id: string;
  email: string;
  name: string | null;
  role_ids: number[];
};

export default function CommunityUserRolesPage() {
  const [users, setUsers] = useState<CommunityUser[]>([]);
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [query, setQuery] = useState("");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) throw new Error("Niet aangemeld.");

        const [rolesResult, usersResponse] = await Promise.all([
          getCommunityRoles(),
          fetch("/api/admin/community/users", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }),
        ]);

        const usersPayload = await usersResponse.json();

        if (!usersResponse.ok) {
          throw new Error(usersPayload.error ?? "Gebruikers laden mislukt.");
        }

        setRoles(rolesResult);
        setUsers(usersPayload.users ?? []);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Laden mislukt.",
        );
      }
    }

    void load();
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;

    return users.filter((user) =>
      `${user.name ?? ""} ${user.email}`
        .toLowerCase()
        .includes(value),
    );
  }, [query, users]);

  async function toggleRole(user: CommunityUser, roleId: number) {
    const nextRoleIds = user.role_ids.includes(roleId)
      ? user.role_ids.filter((id) => id !== roleId)
      : [...user.role_ids, roleId];

    setUsers((items) =>
      items.map((item) =>
        item.id === user.id
          ? { ...item, role_ids: nextRoleIds }
          : item,
      ),
    );

    try {
      setSavingUserId(user.id);
      await setUserCommunityRoles(user.id, nextRoleIds);
    } catch (error) {
      setUsers((items) =>
        items.map((item) =>
          item.id === user.id ? user : item,
        ),
      );
      setErrorMessage(
        error instanceof Error ? error.message : "Opslaan mislukt.",
      );
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
            Community Admin
          </p>
          <h1 className="ucl-title mt-3">
            Gebruikersrollen
          </h1>
          <p className="ucl-subtitle">
            Een gebruiker kan meerdere rollen tegelijk hebben.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <input
          className="ucl-input mt-6"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Zoek op naam of e-mailadres"
        />

        <section className="mt-6 space-y-4">
          {filtered.map((user) => (
            <article key={user.id} className="ucl-card">
              <div>
                <h2 className="font-black text-white">
                  {user.name || "Naam niet ingesteld"}
                </h2>
                <p className="mt-1 text-sm text-white/40">
                  {user.email}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {roles.map((role) => {
                  const selected = user.role_ids.includes(role.id);

                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={savingUserId === user.id}
                      onClick={() => void toggleRole(user, role.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                        selected
                          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                          : "border-white/10 bg-white/5 text-white/45"
                      }`}
                    >
                      {role.icon} {role.name}
                    </button>
                  );
                })}
              </div>

              {savingUserId === user.id ? (
                <p className="mt-3 text-xs font-bold text-emerald-200">
                  Rollen opslaan…
                </p>
              ) : null}
            </article>
          ))}
        </section>

        <div className="mt-8">
          <Link href="/admin/community" className="ucl-button-secondary">
            ← Terug naar Community Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
