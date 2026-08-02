"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  submitAppFeedback,
  type FeedbackCategory,
} from "@/src/lib/app-feedback";

const categories: Array<{
  value: FeedbackCategory;
  label: string;
  description: string;
}> = [
  {
    value: "feedback",
    label: "Algemene feedback",
    description: "Vertel wat je van de app vindt.",
  },
  {
    value: "verbeterpunt",
    label: "Verbeterpunt",
    description: "Wat kan volgens jou beter?",
  },
  {
    value: "uitbreiding",
    label: "Nieuwe uitbreiding",
    description: "Welke functie zou je graag toegevoegd zien?",
  },
  {
    value: "bug",
    label: "Probleem of bug",
    description: "Meld iets dat niet correct werkt.",
  },
];

export default function FeedbackPage() {
  const [category, setCategory] =
    useState<FeedbackCategory>("feedback");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;

    if (title.trim().length < 3) {
      setErrorMessage("Geef een korte titel van minstens 3 tekens.");
      return;
    }

    if (message.trim().length < 10) {
      setErrorMessage("Beschrijf je feedback in minstens 10 tekens.");
      return;
    }

    try {
      setSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      await submitAppFeedback({
        category,
        title,
        message,
        pageUrl,
      });

      setSuccessMessage(
        "✅ Bedankt! Je feedback werd succesvol verstuurd.",
      );
      setCategory("feedback");
      setTitle("");
      setMessage("");
      setPageUrl("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Je feedback kon niet worden verstuurd.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-3xl">
        <header className="ucl-card text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Collectief Wit en Zwet
          </p>

          <h1 className="ucl-title mt-3">
            Feedback van supporters
          </h1>

          <p className="ucl-subtitle mx-auto max-w-2xl">
            Deel feedback, verbeterpunten, problemen of ideeën voor nieuwe
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

        <form onSubmit={handleSubmit} className="ucl-card mt-6">
          <fieldset>
            <legend className="text-sm font-black text-white">
              Waarover gaat je bericht?
            </legend>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {categories.map((item) => (
                <label
                  key={item.value}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    category === item.value
                      ? "border-amber-300/35 bg-amber-300/10"
                      : "border-white/10 bg-black/20 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={item.value}
                    checked={category === item.value}
                    onChange={() => setCategory(item.value)}
                    className="sr-only"
                  />

                  <p className="font-black text-white">
                    {item.label}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-white/40">
                    {item.description}
                  </p>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="mt-6 block">
            <span className="text-sm font-black text-white">
              Korte titel
            </span>

            <input
              type="text"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Bijvoorbeeld: duidelijkere terugknop"
              className="ucl-input mt-3"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-black text-white">
              Beschrijving
            </span>

            <textarea
              rows={8}
              maxLength={3000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Beschrijf zo duidelijk mogelijk wat je bedoelt..."
              className="ucl-input mt-3 resize-y"
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-black text-white">
              Pagina waarop je dit merkte
            </span>

            <p className="mt-1 text-xs font-semibold text-white/35">
              Optioneel. Bijvoorbeeld: /iedereen-coach
            </p>

            <input
              type="text"
              maxLength={500}
              value={pageUrl}
              onChange={(event) => setPageUrl(event.target.value)}
              placeholder="/klassement"
              className="ucl-input mt-3"
            />
          </label>

          <button
            type="submit"
            disabled={sending}
            className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? "Feedback versturen…" : "💬 Feedback versturen"}
          </button>
        </form>

        <div className="mt-6">
          <Link href="/" className="ucl-button-secondary">
            ← Terug naar dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
