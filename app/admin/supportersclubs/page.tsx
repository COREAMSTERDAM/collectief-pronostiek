"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

type SupporterClub = {
  id: string;
  name: string;
  logo_url: string | null;
  logo_path: string | null;
  city: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  facebook_url: string | null;
  meeting_place: string | null;
  description: string | null;
  travel_info: string | null;
  activities_info: string | null;
  is_active: boolean;
  sort_order: number;
};

type FormState = Omit<SupporterClub, "id">;

const emptyForm: FormState = {
  name: "",
  logo_url: null,
  logo_path: null,
  city: "",
  contact_name: "",
  email: "",
  phone: "",
  website_url: "",
  facebook_url: "",
  meeting_place: "",
  description: "",
  travel_info: "",
  activities_info: "",
  is_active: true,
  sort_order: 0,
};

async function authHeaders(extra?: HeadersInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Je sessie is verlopen.");
  return { Authorization: `Bearer ${token}`, ...(extra ?? {}) };
}

export default function AdminSupportersclubsPage() {
  const [clubs, setClubs] = useState<SupporterClub[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const title = useMemo(() => editingId ? "Supportersclub bewerken" : "Supportersclub toevoegen", [editingId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/supporter-clubs", { headers: await authHeaders(), cache: "no-store" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Supportersclubs laden mislukt.");
      setClubs(json.clubs ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Supportersclubs laden mislukt.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function startEdit(club: SupporterClub) {
    setEditingId(club.id);
    setForm({
      name: club.name,
      logo_url: club.logo_url,
      logo_path: club.logo_path,
      city: club.city ?? "",
      contact_name: club.contact_name ?? "",
      email: club.email ?? "",
      phone: club.phone ?? "",
      website_url: club.website_url ?? "",
      facebook_url: club.facebook_url ?? "",
      meeting_place: club.meeting_place ?? "",
      description: club.description ?? "",
      travel_info: club.travel_info ?? "",
      activities_info: club.activities_info ?? "",
      is_active: club.is_active,
      sort_order: club.sort_order ?? 0,
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/supporter-clubs/logo", { method: "POST", headers: await authHeaders(), body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Logo uploaden mislukt.");
      setForm((current) => ({ ...current, logo_url: json.logo_url, logo_path: json.logo_path }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Logo uploaden mislukt.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const url = editingId ? `/api/admin/supporter-clubs/${editingId}` : "/api/admin/supporter-clubs";
      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: await authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(form),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Opslaan mislukt.");
      setMessage(editingId ? "Supportersclub bijgewerkt." : "Supportersclub toegevoegd.");
      setEditingId(null);
      setForm(emptyForm);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opslaan mislukt.");
    } finally {
      setSaving(false);
    }
  }

  async function removeClub(club: SupporterClub) {
    if (!window.confirm(`Supportersclub “${club.name}” volledig verwijderen?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/supporter-clubs/${club.id}`, { method: "DELETE", headers: await authHeaders() });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Verwijderen mislukt.");
      if (editingId === club.id) resetForm();
      setMessage("Supportersclub verwijderd.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Verwijderen mislukt.");
    }
  }

  const field = (key: keyof FormState, label: string, placeholder = "", type = "text") => (
    <label className="grid gap-1.5 text-sm font-bold text-zinc-700">
      {label}
      <input
        type={type}
        value={String(form[key] ?? "")}
        placeholder={placeholder}
        onChange={(event) => setForm((current) => ({ ...current, [key]: key === "sort_order" ? Number(event.target.value) : event.target.value }))}
        className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-medium text-zinc-950 outline-none focus:border-zinc-500"
      />
    </label>
  );

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-5 text-zinc-950">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/admin-keuze" className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-2xl text-white">‹</Link>
          <div><p className="text-xs font-black uppercase tracking-[.18em] text-zinc-500">Admin</p><h1 className="text-3xl font-black tracking-tight">Supportersclubs</h1></div>
        </div>

        <form onSubmit={submit} className="mb-6 rounded-[28px] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[.16em] text-zinc-400">Beheer</p><h2 className="text-xl font-black">{title}</h2></div>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-black">Annuleren</button> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {field("name", "Naam *", "Supportersclub ...")}
            {field("city", "Gemeente / plaats", "Aalst")}
            {field("contact_name", "Contactpersoon", "Naam contactpersoon")}
            {field("phone", "Telefoon", "04...")}
            {field("email", "E-mail", "info@...", "email")}
            {field("website_url", "Website", "https://...", "url")}
            {field("facebook_url", "Facebook", "https://facebook.com/...", "url")}
            {field("meeting_place", "Ontmoetingsplaats", "Café / lokaal / adres")}
            {field("sort_order", "Volgorde", "0", "number")}
          </div>

          <label className="mt-4 grid gap-1.5 text-sm font-bold text-zinc-700">Korte beschrijving
            <textarea value={form.description ?? ""} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-zinc-500" />
          </label>
          <label className="mt-4 grid gap-1.5 text-sm font-bold text-zinc-700">Bus / verplaatsingsinfo
            <textarea value={form.travel_info ?? ""} onChange={(e) => setForm((c) => ({ ...c, travel_info: e.target.value }))} rows={2} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-zinc-500" />
          </label>
          <label className="mt-4 grid gap-1.5 text-sm font-bold text-zinc-700">Activiteiten
            <textarea value={form.activities_info ?? ""} onChange={(e) => setForm((c) => ({ ...c, activities_info: e.target.value }))} rows={2} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base font-medium outline-none focus:border-zinc-500" />
          </label>

          <div className="mt-4 grid gap-3 rounded-2xl bg-zinc-50 p-4 md:grid-cols-[auto_1fr] md:items-center">
            <div className="h-24 w-24 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {form.logo_url ? <img src={form.logo_url} alt="Logo preview" className="h-full w-full object-contain p-2" /> : <div className="grid h-full place-items-center text-3xl">🏴</div>}
            </div>
            <div>
              <p className="mb-2 text-sm font-black">Logo</p>
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadLogo(file); }} className="block w-full text-sm" />
              <p className="mt-1 text-xs text-zinc-500">PNG, JPG of WebP · maximaal 4 MB.</p>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 font-bold">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))} className="h-5 w-5" /> Actief en zichtbaar
          </label>

          {error ? <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</p> : null}

          <button type="submit" disabled={saving || uploading} className="mt-4 w-full rounded-2xl bg-black px-4 py-3.5 text-base font-black text-white disabled:opacity-50">
            {saving ? "Opslaan…" : editingId ? "Wijzigingen opslaan" : "Supportersclub toevoegen"}
          </button>
        </form>

        <section className="grid gap-3">
          <div className="flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-zinc-500">Overzicht</p><h2 className="text-xl font-black">Bestaande supportersclubs</h2></div><span className="text-sm font-bold text-zinc-500">{clubs.length}</span></div>
          {loading ? <div className="rounded-3xl bg-white p-6 font-bold">Laden…</div> : clubs.length === 0 ? <div className="rounded-3xl bg-white p-6 text-center text-zinc-500">Nog geen supportersclubs toegevoegd.</div> : clubs.map((club) => (
            <article key={club.id} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">{club.logo_url ? <img src={club.logo_url} alt="" className="h-full w-full object-contain p-2" /> : <div className="grid h-full place-items-center text-2xl">🏴</div>}</div>
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-base font-black">{club.name}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${club.is_active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>{club.is_active ? "Actief" : "Verborgen"}</span></div><p className="mt-1 truncate text-sm font-medium text-zinc-500">{club.city || club.meeting_place || "Geen locatie ingevuld"}</p></div>
              <div className="grid gap-2"><button type="button" onClick={() => startEdit(club)} className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black">Bewerk</button><button type="button" onClick={() => void removeClub(club)} className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700">Verwijder</button></div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
