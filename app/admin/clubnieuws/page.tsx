"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

type NewsItem = {
  id: number;
  title: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  source_url: string;
  published_at: string | null;
};

export default function ClubNieuwsAdminPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Niet aangemeld.");
    return fetch(url, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${session.access_token}` },
    });
  }, []);

  const load = useCallback(async () => {
    const response = await authorizedFetch("/api/admin/club-news");
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Nieuws laden mislukt.");
    setItems(json.items ?? []);
  }, [authorizedFetch]);

  const sync = useCallback(async (silent = false) => {
    setSyncing(true);
    if (!silent) setMessage("");
    try {
      const response = await authorizedFetch("/api/admin/club-news", { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Synchronisatie mislukt.");
      await load();
      if (!silent) setMessage(`${json.imported ?? 0} nieuwsitems gecontroleerd/geïmporteerd.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Synchronisatie mislukt.");
    } finally {
      setSyncing(false);
    }
  }, [authorizedFetch, load]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await sync(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [sync]);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Admin preview</p>
            <h1 className="mt-1 text-3xl font-black">Clubnieuws</h1>
            <p className="mt-2 text-zinc-500">Automatisch ingelezen van eendracht-aalst-lede.be. Voorlopig alleen voor admins.</p>
          </div>
          <button
            type="button"
            onClick={() => void sync(false)}
            disabled={syncing}
            className="rounded-xl bg-black px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {syncing ? "Vernieuwen…" : "Nieuws vernieuwen"}
          </button>
        </div>

        {message ? <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm">{message}</p> : null}

        <section className="mt-6 grid gap-4">
          {loading ? <p>Nieuws laden…</p> : null}
          {!loading && !items.length ? <p>Er zijn nog geen nieuwsberichten geïmporteerd.</p> : null}
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm sm:grid sm:grid-cols-[180px_1fr]">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="h-44 w-full object-cover sm:h-full" />
              ) : (
                <div className="flex h-32 items-center justify-center bg-zinc-100 text-4xl sm:h-full">📰</div>
              )}
              <div className="p-5">
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  {item.category ? <span>{item.category}</span> : null}
                  {item.published_at ? <span>· {new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric" }).format(new Date(item.published_at))}</span> : null}
                </div>
                <h2 className="mt-2 text-xl font-black">{item.title}</h2>
                {item.excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">{item.excerpt}</p> : null}
                <a href={item.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex font-bold underline">Lees origineel artikel</a>
              </div>
            </article>
          ))}
        </section>

        <Link href="/admin-keuze" className="mt-8 inline-flex font-bold underline">← Terug naar admin</Link>
      </div>
    </main>
  );
}
