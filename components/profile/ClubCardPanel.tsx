"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type ClubCardRow = {
  id: string;
  clubcard_code: string;
  source_url: string;
  created_at: string;
  updated_at: string;
};

const ALLOWED_HOST = "eendracht-aalst-lede.eventpay.be";
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;
const MAX_CARDS = 2;

function extractClubCardCode(value: string) {
  const trimmed = value.trim();

  if (!trimmed) throw new Error("Vul je Club Card-link of code in.");

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
    throw new Error("Vul een geldige Club Card-link of code in.");
  }

  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    throw new Error("Deze link hoort niet bij de officiële Club Card-website.");
  }

  const match = url.pathname.match(/^\/w\/([A-Za-z0-9_-]{4,64})\/?$/);
  if (!match) {
    throw new Error("De Club Card-code kon niet uit deze link worden gehaald.");
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
  const [clubCards, setClubCards] = useState<ClubCardRow[]>([]);
  const [manualValue, setManualValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadClubCards() {
      try {
        setLoading(true);
        setErrorMessage("");

        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("Je moet aangemeld zijn om een Club Card te koppelen.");
        }

        if (!mounted) return;
        setUserId(user.id);

        const { data, error } = await supabase
          .from("profile_club_cards")
          .select("id, clubcard_code, source_url, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!mounted) return;

        setClubCards((data as ClubCardRow[] | null) ?? []);
      } catch (error) {
        if (!mounted) return;
        setErrorMessage(error instanceof Error ? error.message : "De Club Cards konden niet worden geladen.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadClubCards();
    return () => { mounted = false; };
  }, []);

  async function saveCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!userId || saving || clubCards.length >= MAX_CARDS) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setMessage("");

      const parsed = extractClubCardCode(manualValue);

      if (clubCards.some((card) => card.clubcard_code.toLowerCase() === parsed.code.toLowerCase())) {
        throw new Error("Deze Club Card is al aan je profiel gekoppeld.");
      }

      const { data, error } = await supabase
        .from("profile_club_cards")
        .insert({
          user_id: userId,
          clubcard_code: parsed.code,
          source_url: parsed.sourceUrl,
        })
        .select("id, clubcard_code, source_url, created_at, updated_at")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Deze Club Card is al aan een ander account gekoppeld.");
        }
        if (error.message?.includes("maximum of 2") || error.message?.includes("maximum van 2")) {
          throw new Error("Je kunt maximaal 2 Club Cards aan je profiel koppelen.");
        }
        throw error;
      }

      setClubCards((current) => [...current, data as ClubCardRow]);
      setManualValue("");
      setMessage("✅ Je Club Card werd veilig aan je profiel gekoppeld.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "De Club Card kon niet worden opgeslagen.");
    } finally {
      setSaving(false);
    }
  }

  async function removeClubCard(card: ClubCardRow) {
    if (!userId || removingId) return;

    const confirmed = window.confirm("Wil je deze gekoppelde Club Card echt uit je profiel verwijderen?");
    if (!confirmed) return;

    try {
      setRemovingId(card.id);
      setErrorMessage("");
      setMessage("");

      const { error } = await supabase
        .from("profile_club_cards")
        .delete()
        .eq("id", card.id)
        .eq("user_id", userId);

      if (error) throw error;

      setClubCards((current) => current.filter((item) => item.id !== card.id));
      setMessage("De Club Card werd uit je profiel verwijderd.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "De Club Card kon niet worden verwijderd.");
    } finally {
      setRemovingId(null);
    }
  }

  const canAddCard = clubCards.length < MAX_CARDS;

  return (
    <section className="ucl-card overflow-hidden">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-400/10 text-2xl">💳</div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200/70">Mijn profiel</p>
            <h2 className="mt-1 text-2xl font-black text-white">Club Cards</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Koppel maximaal twee Club Cards aan je profiel. De codes worden privé opgeslagen en zijn niet zichtbaar voor andere supporters.
            </p>
          </div>
        </div>

        {clubCards.length > 0 ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-2 text-xs font-black text-emerald-200">
            ✓ {clubCards.length} gekoppeld
          </span>
        ) : null}
      </div>

      {errorMessage ? <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">{errorMessage}</div> : null}
      {message ? <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">{message}</div> : null}

      {loading ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-center text-sm font-semibold text-white/40">Club Cards laden…</div>
      ) : (
        <>
          {clubCards.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {clubCards.map((card, index) => (
                <div key={card.id} className="rounded-[1.75rem] border border-amber-300/20 bg-gradient-to-br from-amber-300/10 via-white/[0.04] to-black p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/35">Club Card {index + 1}</p>
                      <p className="mt-2 text-2xl font-black tracking-[0.18em] text-white">{maskCode(card.clubcard_code)}</p>
                      <p className="mt-2 text-xs font-semibold text-white/35">De volledige code wordt niet op je profiel getoond.</p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-xl">✓</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeClubCard(card)}
                    disabled={Boolean(removingId) || saving}
                    className="mt-4 w-full rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-2.5 text-sm font-black text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {removingId === card.id ? "Verwijderen…" : `🗑 Kaart ${index + 1} verwijderen`}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.75rem] border border-dashed border-white/15 bg-black/20 p-5 text-center">
              <div className="text-4xl">💳</div>
              <h3 className="mt-3 text-xl font-black text-white">Nog geen Club Card gekoppeld</h3>
            </div>
          )}

          {canAddCard ? (
            <form onSubmit={saveCode} className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <label className="block">
                <span className="text-sm font-black text-white">{clubCards.length === 0 ? "Club Card-code" : "Tweede Club Card-code"}</span>
                <p className="mt-1 text-xs leading-5 text-white/40">Voer de code in die onder de QR-code van je Club Card staat.</p>
                <input
                  type="text"
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="Bijvoorbeeld: A11AABC0"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="ucl-input mt-3"
                />
              </label>

              <button
                type="submit"
                disabled={!manualValue.trim() || saving || Boolean(removingId)}
                className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Club Card opslaan…" : clubCards.length === 0 ? "💾 Club Card koppelen" : "＋ Tweede Club Card koppelen"}
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
              Je hebt het maximum van 2 Club Cards gekoppeld.
            </div>
          )}
        </>
      )}
    </section>
  );
}
