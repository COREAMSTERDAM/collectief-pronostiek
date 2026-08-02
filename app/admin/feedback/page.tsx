"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAllAppFeedback,
  updateAppFeedback,
  type AppFeedback,
  type FeedbackCategory,
  type FeedbackStatus,
} from "@/src/lib/app-feedback";

const statusOptions: FeedbackStatus[] = [
  "nieuw",
  "bekeken",
  "gepland",
  "afgewerkt",
  "afgewezen",
];

function categoryLabel(category: FeedbackCategory) {
  if (category === "verbeterpunt") return "Verbeterpunt";
  if (category === "uitbreiding") return "Uitbreiding";
  if (category === "bug") return "Bug";
  return "Feedback";
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<AppFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] =
    useState<FeedbackStatus | "alles">("alles");
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [drafts, setDrafts] = useState<
    Record<number, { status: FeedbackStatus; adminNote: string }>
  >({});

  async function loadFeedback() {
    try {
      setLoading(true);
      setErrorMessage("");

      const result = await getAllAppFeedback();

      setFeedback(result);
      setDrafts(
        Object.fromEntries(
          result.map((item) => [
            item.id,
            {
              status: item.status,
              adminNote: item.admin_note ?? "",
            },
          ]),
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De feedback kon niet worden geladen.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeedback();
  }, []);

  const filteredFeedback = useMemo(() => {
    const query = search.trim().toLowerCase();

    return feedback.filter((item) => {
      const statusMatches =
        filter === "alles" || item.status === filter;

      const searchMatches =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.message.toLowerCase().includes(query) ||
        item.profile?.name?.toLowerCase().includes(query);

      return statusMatches && searchMatches;
    });
  }, [feedback, filter, search]);

  async function saveFeedback(item: AppFeedback) {
    const draft = drafts[item.id];
    if (!draft || busyId !== null) return;

    try {
      setBusyId(item.id);
      setErrorMessage("");
      setSuccessMessage("");

      await updateAppFeedback({
        id: item.id,
        status: draft.status,
        adminNote: draft.adminNote,
      });

      setSuccessMessage("✅ Feedback werd bijgewerkt.");
      await loadFeedback();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De feedback kon niet worden bijgewerkt.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-6xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Admin
          </p>

          <h1 className="ucl-title mt-3">
            Feedback van supporters
          </h1>

          <p className="ucl-subtitle max-w-3xl">
            Bekijk feedback, verbeterpunten, bugs en voorstellen voor nieuwe
            uitbreidingen.
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
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek in feedback of op naam"
            className="ucl-input"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {(["alles", ...statusOptions] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`rounded-full border px-4 py-2 text-xs font-black capitalize ${
                  filter === status
                    ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/5 text-white/45"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">Feedback laden…</p>
          </section>
        ) : filteredFeedback.length === 0 ? (
          <section className="ucl-card mt-6 text-center">
            <p className="ucl-subtitle">Geen feedback gevonden.</p>
          </section>
        ) : (
          <section className="mt-6 space-y-5">
            {filteredFeedback.map((item) => {
              const draft = drafts[item.id] ?? {
                status: item.status,
                adminNote: item.admin_note ?? "",
              };

              return (
                <article key={item.id} className="ucl-card">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black">
                      {categoryLabel(item.category)}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-black capitalize text-white/45">
                      {item.status}
                    </span>
                  </div>

                  <h2 className="mt-5 text-2xl font-black text-white">
                    {item.title}
                  </h2>

                  <p className="mt-3 whitespace-pre-wrap leading-7 text-white/65">
                    {item.message}
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/45">
                    <p>
                      <span className="font-black text-white/65">
                        Supporter:
                      </span>{" "}
                      {item.profile?.name ?? "Onbekend"}
                    </p>

                    <p className="mt-2">
                      <span className="font-black text-white/65">
                        Pagina:
                      </span>{" "}
                      {item.page_url || "Niet vermeld"}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-[14rem_1fr]">
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            status: event.target.value as FeedbackStatus,
                          },
                        }))
                      }
                      className="ucl-input"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    <textarea
                      rows={3}
                      value={draft.adminNote}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...draft,
                            adminNote: event.target.value,
                          },
                        }))
                      }
                      placeholder="Optionele interne adminnotitie..."
                      className="ucl-input resize-y"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={busyId !== null}
                    onClick={() => void saveFeedback(item)}
                    className="ucl-button-primary disabled:opacity-40"
                  >
                    {busyId === item.id
                      ? "Opslaan…"
                      : "💾 Status en notitie opslaan"}
                  </button>
                </article>
              );
            })}
          </section>
        )}

        <div className="mt-8">
          <Link href="/admin-keuze" className="ucl-button-secondary">
            ← Terug naar admin
          </Link>
        </div>
      </div>
    </main>
  );
}
