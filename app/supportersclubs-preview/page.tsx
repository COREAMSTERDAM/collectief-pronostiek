"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type SupporterClub = {
  id: string;
  name: string;
  logo_url: string | null;
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
};

export default function SupportersclubsPreviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<SupporterClub[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.replace("/login?reason=login-required"); return; }
        const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
        if (!profile?.is_admin) { router.replace("/"); return; }

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Je sessie is verlopen.");
        const response = await fetch("/api/admin/supporter-clubs", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Supportersclubs laden mislukt.");
        if (active) setClubs((json.clubs ?? []).filter((club: SupporterClub) => club.is_active));
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Supportersclubs laden mislukt.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  if (loading) return <main className="supportersclubs-preview-page"><div className="supportershub-menu-loading">Supportersclubs laden…</div></main>;

  return (
    <main className="supportersclubs-preview-page">
      <header className="supportershub-menu-header">
        <Link href="/supportershub-preview" className="supportershub-menu-back" aria-label="Terug">‹</Link>
        <div><p>Supportershub</p><h1>Supportersclubs</h1><span>Vind supportersclubs, contact en activiteiten.</span></div>
      </header>

      <section className="supportersclubs-intro-card">
        <span className="supportersclubs-intro-icon">🏴</span>
        <div><p className="native-eyebrow">Samen supporter</p><h2>Supportersclubs op één plek</h2><p>Ontdek waar supporters samenkomen, hoe je contact opneemt en welke activiteiten of verplaatsingen gepland zijn.</p></div>
      </section>

      {error ? <section className="supportersclubs-empty-card"><h2>Kon supportersclubs niet laden</h2><p>{error}</p></section> : null}

      {!error && clubs.length === 0 ? (
        <section className="supportersclubs-empty-card">
          <div className="supportersclubs-empty-icon">👥</div><h2>Nog geen supportersclubs toegevoegd</h2><p>Zodra een admin een supportersclub activeert, verschijnt die hier automatisch.</p>
        </section>
      ) : null}

      {clubs.length > 0 ? (
        <section className="grid gap-4">
          {clubs.map((club) => (
            <article key={club.id} className="overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-4 p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50">
                  {club.logo_url ? <img src={club.logo_url} alt={`Logo ${club.name}`} className="h-full w-full object-contain p-2" /> : <div className="grid h-full place-items-center text-3xl">🏴</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[.14em] text-zinc-400">Supportersclub</p>
                  <h2 className="mt-1 text-xl font-black leading-tight text-zinc-950">{club.name}</h2>
                  <p className="mt-1 text-sm font-bold text-zinc-500">{club.city || "Locatie niet ingevuld"}</p>
                </div>
              </div>

              {club.description ? <p className="px-4 pb-4 text-sm font-medium leading-relaxed text-zinc-600">{club.description}</p> : null}

              <div className="grid gap-2 border-t border-zinc-100 p-4 text-sm">
                {club.meeting_place ? <div className="flex gap-3"><span>📍</span><div><strong className="block">Ontmoetingsplaats</strong><span className="text-zinc-500">{club.meeting_place}</span></div></div> : null}
                {club.contact_name ? <div className="flex gap-3"><span>👤</span><div><strong className="block">Contactpersoon</strong><span className="text-zinc-500">{club.contact_name}</span></div></div> : null}
                {club.travel_info ? <div className="flex gap-3"><span>🚌</span><div><strong className="block">Verplaatsingen</strong><span className="text-zinc-500 whitespace-pre-line">{club.travel_info}</span></div></div> : null}
                {club.activities_info ? <div className="flex gap-3"><span>📅</span><div><strong className="block">Activiteiten</strong><span className="text-zinc-500 whitespace-pre-line">{club.activities_info}</span></div></div> : null}
              </div>

              {(club.phone || club.email || club.website_url || club.facebook_url) ? (
                <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 p-4">
                  {club.phone ? <a href={`tel:${club.phone}`} className="rounded-2xl bg-zinc-100 px-3 py-2.5 text-center text-sm font-black">Bellen</a> : null}
                  {club.email ? <a href={`mailto:${club.email}`} className="rounded-2xl bg-zinc-100 px-3 py-2.5 text-center text-sm font-black">E-mail</a> : null}
                  {club.website_url ? <a href={club.website_url} target="_blank" rel="noreferrer" className="rounded-2xl bg-black px-3 py-2.5 text-center text-sm font-black text-white">Website</a> : null}
                  {club.facebook_url ? <a href={club.facebook_url} target="_blank" rel="noreferrer" className="rounded-2xl bg-black px-3 py-2.5 text-center text-sm font-black text-white">Facebook</a> : null}
                </div>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
