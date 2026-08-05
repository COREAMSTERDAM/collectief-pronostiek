"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getMyCommunityStructure,
  type CommunityCategory,
} from "@/src/lib/community";
import { supabase } from "@/src/lib/supabase";
import {
  getCommunityUnreadCounts,
  type CommunityUnreadCounts,
} from "@/src/lib/community-experience";

export default function CommunityPage() {
  const [categories, setCategories] =
    useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] =
    useState<CommunityUnreadCounts>({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href =
            "/login?reason=login-required";
          return;
        }

        const [result, unreadResult] = await Promise.all([
          getMyCommunityStructure(),
          getCommunityUnreadCounts(),
        ]);

        if (mounted) {
          setCategories(result);
          setUnreadCounts(unreadResult);
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "De community kon niet worden geladen.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Collectief Wit en Zwet
          </p>

          <h1 className="ucl-title mt-3">
            Community
          </h1>

          <p className="ucl-subtitle max-w-3xl">
            Praat mee in de categorieën en kanalen waarvoor je toegang
            hebt. Nieuwe berichten verschijnen automatisch.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-muted">
              Community laden…
            </p>
          </section>
        ) : categories.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <h2 className="text-xl font-black text-white">
              Geen toegankelijke categorieën
            </h2>

            <p className="ucl-subtitle">
              Er zijn momenteel geen communitykanalen beschikbaar voor
              jouw rollen.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-5 lg:grid-cols-2">
            {categories.map((category) => (
              <article
                key={category.id}
                className="ucl-card overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                    {category.icon}
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-white">
                      {category.name}
                    </h2>

                    {category.description ? (
                      <p className="mt-1 text-sm leading-6 text-white/45">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {category.channels.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm font-semibold text-white/35">
                      Geen toegankelijke kanalen.
                    </p>
                  ) : (
                    category.channels.map((channel) => (
                      <Link
                        key={channel.id}
                        href={`/community/${channel.id}`}
                        className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-amber-300/25 hover:bg-white/[0.055]"
                      >
                        <span className="text-lg">
                          {channel.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-black text-white">
                            {channel.name}
                          </p>

                          {channel.description ? (
                            <p className="mt-1 truncate text-xs text-white/35">
                              {channel.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {(unreadCounts[String(channel.id)] ?? 0) > 0 ? (
                            <span className="flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-1 text-[10px] font-black text-white shadow-lg shadow-red-950/30">
                              {Math.min(
                                unreadCounts[String(channel.id)] ?? 0,
                                99,
                              )}
                            </span>
                          ) : null}

                          {channel.is_read_only ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-black uppercase text-white/35">
                              Alleen lezen
                            </span>
                          ) : (
                            <span className="text-white/20 transition group-hover:translate-x-1 group-hover:text-amber-200">
                              ›
                            </span>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </article>
            ))}
          </section>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="ucl-button-secondary"
          >
            ← Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
