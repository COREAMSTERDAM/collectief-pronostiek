"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/src/lib/supabase";

type NewsSource = "clubwebsite" | "hln" | "nieuwsblad";
type NewsFilter = "all" | NewsSource;

type NewsItem = {
  id: number;
  source: NewsSource;
  title: string;
  excerpt: string | null;
  category: string | null;
  image_url: string | null;
  source_url: string;
  published_at: string | null;
  matched_keyword: string | null;
};

const SOURCE_LABELS: Record<NewsSource, string> = {
  clubwebsite: "Clubwebsite",
  hln: "HLN",
  nieuwsblad: "Nieuwsblad",
};

const FILTERS: Array<{ value: NewsFilter; label: string }> = [
  { value: "all", label: "Alles" },
  { value: "clubwebsite", label: "Clubwebsite" },
  { value: "hln", label: "HLN" },
  { value: "nieuwsblad", label: "Nieuwsblad" },
];

export default function ClubNieuwsAdminPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [filter, setFilter] = useState<NewsFilter>("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const authorizedFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Niet aangemeld.");
    return fetch(url, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  }, []);

  const load = useCallback(async () => {
    const response = await authorizedFetch("/api/admin/club-news");
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Nieuws laden mislukt.");
    setItems(json.items ?? []);
  }, [authorizedFetch]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setMessage("");
    try {
      const response = await authorizedFetch("/api/admin/club-news", { method: "POST" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Synchronisatie mislukt.");
      await load();

      const counts = json.counts ?? {};
      const summary = `Clubwebsite ${counts.clubwebsite ?? 0} · HLN ${counts.hln ?? 0} · Nieuwsblad ${counts.nieuwsblad ?? 0}`;
      const errors = Object.values(json.source_errors ?? {}).filter(Boolean) as string[];
      setMessage(
        errors.length
          ? `${summary}. Sommige bronnen gaven een fout: ${errors.join(" ")}`
          : `${summary}. Nieuwscontrole voltooid.`,
      );
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
        await load();
      } catch (error) {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Nieuws laden mislukt.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [load]);

  const visibleItems = useMemo(
    () => filter === "all" ? items : items.filter((item) => item.source === filter),
    [filter, items],
  );

  const sourceCounts = useMemo(() => ({
    all: items.length,
    clubwebsite: items.filter((item) => item.source === "clubwebsite").length,
    hln: items.filter((item) => item.source === "hln").length,
    nieuwsblad: items.filter((item) => item.source === "nieuwsblad").length,
  }), [items]);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Admin preview
            </p>
            <h1 className="mt-1 text-3xl font-black">Clubnieuws</h1>
            <p className="mt-2 text-zinc-500">
              Eén nieuwsfeed met de clubwebsite, HLN en Nieuwsblad. Alle bronnen worden elke 15 minuten gecontroleerd. Voorlopig alleen zichtbaar voor admins.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              Extern nieuws wordt gefilterd op: <strong>Iendracht</strong>, <strong>Eendracht Aalst</strong>, <strong>Eendracht Aalst-Lede</strong> en <strong>Aalst-Lede</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="rounded-xl bg-black px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {syncing ? "Vernieuwen…" : "Nieuws vernieuwen"}
          </button>
        </div>

        {message ? (
          <p className="mt-4 rounded-xl bg-zinc-100 p-3 text-sm">{message}</p>
        ) : null}

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? "border-black bg-black text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                {item.label} ({sourceCounts[item.value]})
              </button>
            );
          })}
        </div>

        <section className="mt-5 grid gap-4">
          {loading ? <p>Nieuws laden…</p> : null}
          {!loading && !visibleItems.length ? (
            <p className="rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-500">
              Voor deze bron zijn nog geen nieuwsberichten gevonden.
            </p>
          ) : null}

          {visibleItems.map((item) => (
            <a
              key={item.id}
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Lees artikel: ${item.title}`}
              className="group block overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 sm:grid sm:grid-cols-[180px_1fr]"
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt=""
                  className="h-44 w-full object-cover transition duration-200 group-hover:scale-[1.02] sm:h-full"
                />
              ) : (
                <div className="flex h-32 items-center justify-center bg-zinc-100 text-4xl sm:h-full">
                  📰
                </div>
              )}

              <div className="p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-800">
                    {SOURCE_LABELS[item.source] ?? "Nieuws"}
                  </span>
                  {item.category && item.category !== SOURCE_LABELS[item.source] ? (
                    <span>{item.category}</span>
                  ) : null}
                  {item.published_at ? (
                    <span>
                      · {new Intl.DateTimeFormat("nl-BE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }).format(new Date(item.published_at))}
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-2 text-xl font-black group-hover:underline">
                  {item.title}
                </h2>

                {item.excerpt ? (
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600">
                    {item.excerpt}
                  </p>
                ) : null}

                {item.matched_keyword ? (
                  <p className="mt-3 text-xs font-semibold text-zinc-500">
                    Gevonden op: {item.matched_keyword}
                  </p>
                ) : null}

                <span className="mt-4 inline-flex items-center gap-1 font-bold underline underline-offset-4">
                  Lees artikel <span aria-hidden="true">→</span>
                </span>
              </div>
            </a>
          ))}
        </section>

        <Link href="/admin-keuze" className="mt-8 inline-flex font-bold underline">
          ← Terug naar admin
        </Link>
      </div>
    </main>
  );
}
