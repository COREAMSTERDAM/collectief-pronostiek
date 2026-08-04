"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type ClubCardRow = {
  clubcard_code: string;
  source_url: string;
  created_at: string;
  updated_at: string;
};

const ALLOWED_HOST = "eendracht-aalst-lede.eventpay.be";
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

function extractClubCardCode(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Vul je Club Card-link of code in.");
  }

  if (CODE_PATTERN.test(trimmed)) {
    return {
      code: trimmed,
      sourceUrl: `https://${ALLOWED_HOST}/w/${trimmed}`,
    };
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      "Vul een geldige Club Card-link of code in.",
    );
  }

  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    throw new Error(
      "Deze link hoort niet bij de officiële Club Card-website.",
    );
  }

  const match = url.pathname.match(
    /^\/w\/([A-Za-z0-9_-]{4,64})\/?$/,
  );

  if (!match) {
    throw new Error(
      "De Club Card-code kon niet uit deze link worden gehaald.",
    );
  }

  return {
    code: match[1],
    sourceUrl: `https://${ALLOWED_HOST}/w/${match[1]}`,
  };
}

function maskCode(code: string) {
  if (code.length <= 2) return "••••••";
  return `••••••${code.slice(-2).toUpperCase()}`;
}

export default function ClubCardPanel() {
  const [userId, setUserId] = useState<string | null>(null);
  const [clubCard, setClubCard] = useState<ClubCardRow | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadClubCard() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error(
            "Je moet aangemeld zijn om een Club Card te koppelen.",
          );
        }

        if (!mounted) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from("profile_club_cards")
          .select(
            "clubcard_code, source_url, created_at, updated_at",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (!mounted) return;

        setClubCard((data as ClubCardRow | null) ?? null);
      } catch (error) {
        if (!mounted) return;

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "De Club Card kon niet worden geladen.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadClubCard();

    return () => {
      mounted = false;
    };
  }, []);

  async function saveCode(
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    if (!userId || saving) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setMessage("");

      const parsed = extractClubCardCode(manualValue);

      const { data, error } = await supabase
        .from("profile_club_cards")
        .upsert(
          {
            user_id: userId,
            clubcard_code: parsed.code,
            source_url: parsed.sourceUrl,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
          },
        )
        .select(
          "clubcard_code, source_url, created_at, updated_at",
        )
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error(
            "Deze Club Card is al aan een ander account gekoppeld.",
          );
        }

        throw error;
      }

      setClubCard(data as ClubCardRow);
      setManualValue("");
      setMessage(
        "✅ Je Club Card werd veilig aan je profiel gekoppeld.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De Club Card kon niet worden opgeslagen.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeClubCard() {
    if (!userId || removing) return;

    const confirmed = window.confirm(
      "Wil je de gekoppelde Club Card echt uit je profiel verwijderen?",
    );

    if (!confirmed) return;

    try {
      setRemoving(true);
      setErrorMessage("");
      setMessage("");

      const { error } = await supabase
        .from("profile_club_cards")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      setClubCard(null);
      setMessage(
        "De Club Card werd uit je profiel verwijderd.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De Club Card kon niet worden verwijderd.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <section className="ucl-card overflow-hidden">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-2xl">
            💳
          </div>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200/70">
              Mijn profiel
            </p>

            <h2 className="mt-1 text-2xl font-black text-white">
              Club Card
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Vul de volledige Club Card-link of alleen de code in. De code
              wordt privé opgeslagen en is niet zichtbaar wanneer andere
              supporters je profiel bekijken.
            </p>
          </div>
        </div>

        {clubCard ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200">
            ✓ Gekoppeld
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
          {errorMessage}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-center text-sm font-semibold text-white/40">
          Club Card laden…
        </div>
      ) : (
        <>
          {clubCard ? (
            <div className="mt-5 rounded-[1.75rem] border border-amber-300/20 bg-gradient-to-br from-amber-300/10 via-white/[0.04] to-black p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">
                    Gekoppelde kaart
                  </p>

                  <p className="mt-2 text-2xl font-black tracking-[0.18em] text-white">
                    {maskCode(clubCard.clubcard_code)}
                  </p>

                  <p className="mt-2 text-xs font-semibold text-white/35">
                    De volledige code wordt niet op je profiel getoond.
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-2xl">
                  ✓
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.75rem] border border-dashed border-white/15 bg-black/20 p-5 text-center">
              <div className="text-4xl">💳</div>

              <h3 className="mt-3 text-xl font-black text-white">
                Nog geen Club Card gekoppeld
              </h3>

              <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/45">
                Voorbeeldlink:
                <span className="mt-1 block break-all font-bold text-white/65">
                  https://eendracht-aalst-lede.eventpay.be/w/A12T4FG1
                </span>
              </p>
            </div>
          )}

          <form
            onSubmit={saveCode}
            className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <label className="block">
              <span className="text-sm font-black text-white">
                Club Card-link of code
              </span>

              <p className="mt-1 text-xs leading-5 text-white/40">
                Je mag de volledige EventPay-link plakken of alleen het laatste
                deel, bijvoorbeeld <strong>A12T4FG1</strong>.
              </p>

              <input
                type="text"
                value={manualValue}
                onChange={(event) =>
                  setManualValue(event.target.value)
                }
                placeholder="https://.../w/A12T4FG1"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="ucl-input mt-3"
              />
            </label>

            <button
              type="submit"
              disabled={!manualValue.trim() || saving || removing}
              className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving
                ? "Club Card opslaan…"
                : clubCard
                  ? "💾 Club Card wijzigen"
                  : "💾 Club Card koppelen"}
            </button>
          </form>

          {clubCard ? (
            <button
              type="button"
              onClick={() => void removeClubCard()}
              disabled={removing || saving}
              className="mt-4 w-full rounded-2xl border border-red-300/20 bg-red-400/10 px-5 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {removing
                ? "Verwijderen…"
                : "🗑 Club Card verwijderen"}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
