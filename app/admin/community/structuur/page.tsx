"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAdminCommunityCategories } from "@/src/lib/community";

export default function CommunityStructureAdminPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    getAdminCommunityCategories()
      .then(setCategories)
      .catch((error) =>
        setErrorMessage(
          error instanceof Error ? error.message : "Laden mislukt.",
        ),
      );
  }, []);

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-200/70">
            Community Admin
          </p>
          <h1 className="ucl-title mt-3">Categorieën en kanalen</h1>
          <p className="ucl-subtitle">
            Sprint 1 toont de volledige datagedreven structuur. Aanmaken,
            bewerken en slepen wordt in de volgende beheersprint toegevoegd.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-2">
          {categories.map((category) => (
            <article key={category.id} className="ucl-card">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <h2 className="text-xl font-black text-white">
                    {category.name}
                  </h2>
                  <p className="text-xs text-white/35">
                    {category.slug}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {(category.community_channels ?? [])
                  .sort(
                    (a: any, b: any) =>
                      a.sort_order - b.sort_order,
                  )
                  .map((channel: any) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <span>{channel.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-white">
                          {channel.name}
                        </p>
                        <p className="mt-1 text-xs text-white/35">
                          {channel.description}
                        </p>
                      </div>
                      {channel.is_read_only ? (
                        <span className="text-[9px] font-black uppercase text-amber-200">
                          alleen lezen
                        </span>
                      ) : null}
                    </div>
                  ))}
              </div>
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
