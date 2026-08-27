"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  avatar_url: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  clubcard_code: string | null;
  clubcard_top_up_url: string | null;
  membership_level_key: "guest" | "white_member" | "black_member";
  membership_source: string;
  membership_starts_at: string | null;
  membership_expires_at: string | null;
};

type EditingState = {
  name: string;
  email: string;
  membership_level_key: "guest" | "white_member" | "black_member";
  membership_starts_at: string;
};

async function getAccessToken() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Je sessie is verlopen. Meld je opnieuw aan.");
  }

  return session.access_token;
}

function formatDate(value: string | null) {
  if (!value) return "Nog nooit";

  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<Record<string, EditingState>>(
    {},
  );
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const token = await getAccessToken();
      const response = await fetch("/api/admin/users?perPage=100", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = (await response.json()) as {
        users?: AdminUser[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Gebruikers ophalen mislukt.");
      }

      const loadedUsers = result.users ?? [];

      setUsers(loadedUsers);
      setEditing(
        Object.fromEntries(
          loadedUsers.map((user) => [
            user.id,
            {
              name: user.name,
              email: user.email,
              membership_level_key: user.membership_level_key,
              membership_starts_at: user.membership_starts_at
                ? user.membership_starts_at.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            },
          ]),
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gebruikers ophalen mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.clubcard_code?.toLowerCase().includes(query),
    );
  }, [search, users]);

  function updateEditing(
    userId: string,
    changes: Partial<EditingState>,
  ) {
    setEditing((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        ...changes,
      },
    }));
  }

  async function saveUser(user: AdminUser) {
    if (user.is_admin) {
      setErrorMessage(
        "Administrators kunnen niet door andere administrators worden gewijzigd.",
      );
      return;
    }

    const values = editing[user.id];

    if (!values || busyUserId) return;

    try {
      setBusyUserId(user.id);
      setErrorMessage("");
      setSuccessMessage("");

      const token = await getAccessToken();
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          membership_level_key: values.membership_level_key,
          membership_starts_at: values.membership_starts_at,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Gebruiker aanpassen mislukt.");
      }

      setSuccessMessage(
        result.message ?? "De gebruiker werd bijgewerkt.",
      );
      await loadUsers();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gebruiker aanpassen mislukt.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function deleteUser(user: AdminUser) {
    if (user.is_admin) {
      setErrorMessage("Administratoraccounts kunnen niet verwijderd worden.");
      return;
    }
    if (busyUserId) return;

    const confirmed = window.confirm(
      `Gebruiker ${user.name || user.email} volledig verwijderen? Dit verwijdert ook alle gekoppelde appgegevens en kan niet ongedaan gemaakt worden.`,
    );
    if (!confirmed) return;

    try {
      setBusyUserId(user.id);
      setErrorMessage("");
      setSuccessMessage("");
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Gebruiker verwijderen mislukt.");
      setSuccessMessage(result.message ?? "Gebruiker verwijderd.");
      await loadUsers();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Gebruiker verwijderen mislukt.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function sendPasswordReset(user: AdminUser) {
    if (user.is_admin) {
      setErrorMessage(
        "Voor administrators kan geen wachtwoord-reset worden verstuurd door een andere administrator.",
      );
      return;
    }

    if (busyUserId) return;

    const confirmed = window.confirm(
      `Een wachtwoord-resetmail versturen naar ${user.email}?`,
    );

    if (!confirmed) return;

    try {
      setBusyUserId(user.id);
      setErrorMessage("");
      setSuccessMessage("");

      const token = await getAccessToken();
      const response = await fetch(
        `/api/admin/users/${user.id}/reset-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ?? "Resetmail versturen mislukt.",
        );
      }

      setSuccessMessage(
        result.message ?? "De resetmail werd verstuurd.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Resetmail versturen mislukt.",
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
            Admin
          </p>

          <h1 className="ucl-title mt-3">Gebruikersbeheer</h1>

          <p className="ucl-subtitle max-w-2xl">
            Beheer gewone gebruikers. Administratoraccounts zijn volledig
            vergrendeld.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-6 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        <section className="ucl-card mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <label htmlFor="user-search" className="block flex-1">
              <span className="text-sm font-black text-white">
                🔍 Gebruiker zoeken
              </span>

              <input
                id="user-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Zoek op naam, e-mailadres of Club Card-code"
                className="ucl-input mt-3"
              />
            </label>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-black text-white/55">
                {filteredUsers.length} van {users.length} gebruikers
              </span>

              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white"
                >
                  Wissen
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">Gebruikers laden…</p>
          </section>
        ) : filteredUsers.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">Geen gebruikers gevonden.</p>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {filteredUsers.map((user) => {
              const values = editing[user.id] ?? {
                name: user.name,
                email: user.email,
                membership_level_key: user.membership_level_key,
                membership_starts_at: user.membership_starts_at
                  ? user.membership_starts_at.slice(0, 10)
                  : new Date().toISOString().slice(0, 10),
              };
              const busy = busyUserId === user.id;
              const locked = user.is_admin;

              return (
                <article
                  key={user.id}
                  className={`ucl-card ${
                    locked
                      ? "!border-emerald-300/20 !bg-emerald-300/[0.04]"
                      : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-sm font-black">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (user.name || user.email)
                          .split(/\s+|@/)
                          .slice(0, 2)
                          .map((part) => part[0]?.toUpperCase())
                          .join("")
                      )}
                    </div>

                    <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
                      <label>
                        <span className="text-xs font-black uppercase tracking-wide text-white/40">
                          Naam
                        </span>
                        <input
                          type="text"
                          value={values.name}
                          disabled={busy || locked}
                          onChange={(event) =>
                            updateEditing(user.id, {
                              name: event.target.value,
                            })
                          }
                          className="ucl-input mt-2 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </label>

                      <label>
                        <span className="text-xs font-black uppercase tracking-wide text-white/40">
                          E-mailadres
                        </span>
                        <input
                          type="email"
                          value={values.email}
                          disabled={busy || locked}
                          onChange={(event) =>
                            updateEditing(user.id, {
                              email: event.target.value,
                            })
                          }
                          className="ucl-input mt-2 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </label>
                    </div>
                  </div>

                  {locked ? (
                    <div className="mt-4 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-4 text-sm font-bold text-emerald-100">
                      🔒 Dit is een administratoraccount. Naam,
                      e-mailadres en wachtwoordreset zijn geblokkeerd.
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/45 sm:grid-cols-3">
                    <p>
                      <span className="font-black text-white/65">
                        Aangemaakt:
                      </span>{" "}
                      {formatDate(user.created_at)}
                    </p>
                    <p>
                      <span className="font-black text-white/65">
                        Laatste login:
                      </span>{" "}
                      {formatDate(user.last_sign_in_at)}
                    </p>
                    <p>
                      <span className="font-black text-white/65">
                        Rol:
                      </span>{" "}
                      {user.is_admin ? "Admin · vergrendeld" : "Gebruiker"}
                    </p>
                  </div>

                  {!locked ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-end">
                        <label className="flex-1">
                          <span className="text-xs font-black uppercase tracking-wide text-white/40">
                            Lidmaatschap
                          </span>
                          <select
                            value={values.membership_level_key}
                            disabled={busy}
                            onChange={(event) =>
                              updateEditing(user.id, {
                                membership_level_key: event.target.value as EditingState["membership_level_key"],
                              })
                            }
                            className="ucl-input mt-2"
                          >
                            <option value="guest">Gast</option>
                            <option value="white_member">White Member</option>
                            <option value="black_member">Black Member</option>
                          </select>
                        </label>

                        <label className="flex-1">
                          <span className="text-xs font-black uppercase tracking-wide text-white/40">
                            Startdatum
                          </span>
                          <input
                            type="date"
                            value={values.membership_starts_at}
                            disabled={busy}
                            onChange={(event) =>
                              updateEditing(user.id, { membership_starts_at: event.target.value })
                            }
                            className="ucl-input mt-2"
                          />
                        </label>
                      </div>

                      <p className="mt-3 text-xs leading-5 text-white/40">
                        Huidige bron: {user.membership_source === "admin_manual" ? "Handmatig door admin" : user.membership_source === "wordpress_rua" ? "WordPress sync" : "Gast/fallback"}.
                        {user.membership_source === "admin_manual" ? " Deze handmatige keuze wordt niet overschreven door WordPress-sync." : " Opslaan maakt dit een handmatige admin-keuze."}
                      </p>
                      {user.membership_expires_at ? (
                        <p className="mt-1 text-xs font-bold text-white/55">
                          Geldig tot {formatDate(user.membership_expires_at)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-200/60">
                          Club Card
                        </p>

                        {user.clubcard_code ? (
                          <>
                            <p className="mt-2 break-all text-lg font-black tracking-[0.12em] text-white">
                              {user.clubcard_code}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-emerald-300/75">
                              ✓ Club Card gekoppeld
                            </p>
                          </>
                        ) : (
                          <p className="mt-2 text-sm font-black text-white/45">
                            Club Card niet gekoppeld
                          </p>
                        )}
                      </div>

                      {user.clubcard_top_up_url ? (
                        <a
                          href={user.clubcard_top_up_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-5 py-3 text-center text-sm font-black text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-400/15"
                        >
                          ＋ Geld storten via EventPay
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white/25"
                        >
                          EventPay niet beschikbaar
                        </button>
                      )}
                    </div>

                    {user.clubcard_code ? (
                      <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/35">
                        De knop opent de persoonlijke EventPay-wallet van deze gebruiker in een nieuw tabblad.
                      </p>
                    ) : null}
                  </div>

                  {!locked ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        disabled={Boolean(busyUserId)}
                        onClick={() => void saveUser(user)}
                        className="ucl-button-primary !mt-0 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busy ? "Opslaan…" : "💾 Wijzigingen opslaan"}
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(busyUserId) || !user.email}
                        onClick={() => void sendPasswordReset(user)}
                        className="ucl-button-secondary disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        🔐 Wachtwoord-resetmail
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(busyUserId)}
                        onClick={() => void deleteUser(user)}
                        className="rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-3 text-sm font-black text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {busy ? "Bezig…" : "🗑️ Gebruiker verwijderen"}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link href="/admin-keuze" className="ucl-button-secondary">
            ← Terug naar admin
          </Link>
          <Link href="/" className="ucl-button-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
