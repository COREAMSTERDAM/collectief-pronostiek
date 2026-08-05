"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  archiveCommunityRole,
  getCommunityRoles,
  saveCommunityRole,
  type CommunityRole,
} from "@/src/lib/community";

const emptyRole = {
  id: undefined as number | undefined,
  code: "",
  name: "",
  description: "",
  color: "#f5f5f5",
  icon: "👤",
  priority: 0,
  is_default: false,
  is_active: true,
};

export default function CommunityRolesAdminPage() {
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [form, setForm] = useState(emptyRole);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      setRoles(await getCommunityRoles());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Rollen laden mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setErrorMessage("");

      await saveCommunityRole({
        ...form,
        description: form.description || null,
      });

      setForm(emptyRole);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Rol opslaan mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-purple-200/70">
            Community Admin
          </p>
          <h1 className="ucl-title mt-3">Rollen beheren</h1>
          <p className="ucl-subtitle">
            Systeemrollen blijven technisch herkenbaar via hun code. De
            zichtbare naam, beschrijving, kleur en het icoon kunnen worden
            aangepast.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={submit} className="ucl-card">
            <h2 className="text-xl font-black text-white">
              {form.id ? "Rol bewerken" : "Nieuwe rol"}
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-sm font-black text-white">Naam</span>
                <input
                  className="ucl-input mt-2"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                <span className="text-sm font-black text-white">
                  Technische code
                </span>
                <input
                  className="ucl-input mt-2"
                  value={form.code}
                  disabled={Boolean(form.id)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      code: event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9_]/g, "_"),
                    })
                  }
                  required
                />
              </label>

              <label>
                <span className="text-sm font-black text-white">Icoon</span>
                <input
                  className="ucl-input mt-2"
                  value={form.icon}
                  onChange={(event) =>
                    setForm({ ...form, icon: event.target.value })
                  }
                />
              </label>

              <label>
                <span className="text-sm font-black text-white">Kleur</span>
                <input
                  type="color"
                  className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-black/20 p-2"
                  value={form.color}
                  onChange={(event) =>
                    setForm({ ...form, color: event.target.value })
                  }
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-black text-white">
                Beschrijving
              </span>
              <textarea
                className="ucl-input mt-2 resize-y"
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-black text-white">
                Prioriteit
              </span>
              <input
                type="number"
                className="ucl-input mt-2"
                value={form.priority}
                onChange={(event) =>
                  setForm({
                    ...form,
                    priority: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(event) =>
                  setForm({
                    ...form,
                    is_default: event.target.checked,
                  })
                }
              />
              <span className="text-sm font-black text-white">
                Automatisch toepassen als standaardrol
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="ucl-button-primary disabled:opacity-40"
            >
              {saving ? "Opslaan…" : "Rol opslaan"}
            </button>

            {form.id ? (
              <button
                type="button"
                onClick={() => setForm(emptyRole)}
                className="ucl-button-secondary mt-3"
              >
                Annuleren
              </button>
            ) : null}
          </form>

          <section className="ucl-card">
            <h2 className="text-xl font-black text-white">Bestaande rollen</h2>

            {loading ? (
              <p className="ucl-muted mt-5">Rollen laden…</p>
            ) : (
              <div className="mt-5 space-y-3">
                {roles.map((role) => (
                  <article
                    key={role.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-xl"
                        style={{ backgroundColor: `${role.color}20` }}
                      >
                        {role.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">
                          {role.name}
                          {role.is_system ? (
                            <span className="ml-2 text-[10px] uppercase text-sky-300">
                              systeem
                            </span>
                          ) : null}
                        </p>

                        <p className="mt-1 text-xs text-white/40">
                          {role.code} · prioriteit {role.priority}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            id: role.id,
                            code: role.code,
                            name: role.name,
                            description: role.description ?? "",
                            color: role.color,
                            icon: role.icon,
                            priority: role.priority,
                            is_default: role.is_default,
                            is_active: role.is_active,
                          })
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
                      >
                        Bewerken
                      </button>
                    </div>

                    {!role.is_system ? (
                      <button
                        type="button"
                        onClick={async () => {
                          await archiveCommunityRole(role.id);
                          await load();
                        }}
                        className="mt-3 text-xs font-black text-red-300"
                      >
                        Rol archiveren
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="mt-8">
          <Link href="/admin/community" className="ucl-button-secondary">
            ← Terug naar Community Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
