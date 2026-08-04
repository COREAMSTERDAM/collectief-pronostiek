"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type ScannerControls = {
  stop: () => void;
};

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
      "De gescande QR-code bevat geen geldige Club Card-link.",
    );
  }

  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    throw new Error(
      "Deze QR-code hoort niet bij de officiële Club Card-website.",
    );
  }

  const match = url.pathname.match(/^\/w\/([A-Za-z0-9_-]{4,64})\/?$/);

  if (!match) {
    throw new Error(
      "De Club Card-code kon niet uit de gescande link worden gehaald.",
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<ScannerControls | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [clubCard, setClubCard] = useState<ClubCardRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [manualValue, setManualValue] = useState("");
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
          throw new Error("Je moet aangemeld zijn om een Club Card te koppelen.");
        }

        if (!mounted) return;

        setUserId(user.id);

        const { data, error } = await supabase
          .from("profile_club_cards")
          .select("clubcard_code, source_url, created_at, updated_at")
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
      stopScanner();
    };
  }, []);

  function stopScanner() {
    controlsRef.current?.stop();
    controlsRef.current = null;

    const stream = videoRef.current?.srcObject;

    if (stream instanceof MediaStream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function closeScanner() {
    stopScanner();
    setScannerOpen(false);
    setStartingCamera(false);
  }

  async function saveCode(rawValue: string) {
    if (!userId || saving) return;

    try {
      setSaving(true);
      setErrorMessage("");
      setMessage("");

      const parsed = extractClubCardCode(rawValue);

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
        .select("clubcard_code, source_url, created_at, updated_at")
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
      setMessage("✅ Je Club Card werd veilig aan je profiel gekoppeld.");
      closeScanner();
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

  async function startScanner() {
  if (startingCamera || saving) return;

  try {
    setScannerOpen(true);
    setStartingCamera(true);
    setErrorMessage("");
    setMessage("");

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

    const videoElement = videoRef.current;

    if (!videoElement) {
      throw new Error("De cameravoorvertoning kon niet worden geopend.");
    }

    const { BrowserQRCodeReader } = await import("@zxing/browser");

    const reader = new BrowserQRCodeReader();

    const controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
      },
      videoElement,
      (result, error, controls) => {
        if (!result) return;

        controls.stop();
        controlsRef.current = null;

        const stream = videoElement.srcObject;

        if (stream instanceof MediaStream) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
        }

        videoElement.srcObject = null;

        void saveCode(result.getText());
      },
    );

    controlsRef.current = controls;

    window.setTimeout(() => {
      if (!controlsRef.current) return;

      stopScanner();
      setScannerOpen(false);
      setErrorMessage(
        "Er werd geen QR-code gevonden. Probeer opnieuw en houd de code goed binnen het kader.",
      );
    }, 30_000);
  } catch (error) {
    stopScanner();
    setScannerOpen(false);

    setErrorMessage(
      error instanceof Error
        ? error.message
        : "De camera kon niet worden gestart.",
    );
  } finally {
    setStartingCamera(false);
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
      setMessage("De Club Card werd uit je profiel verwijderd.");
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
              Scan de QR-code op je Club Card. De kaartcode wordt privé
              opgeslagen en is nooit zichtbaar wanneer andere supporters je
              profiel bekijken.
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
      ) : clubCard ? (
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

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void startScanner()}
              disabled={startingCamera || saving || removing}
              className="ucl-button-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              📷 Andere kaart scannen
            </button>

            <button
              type="button"
              onClick={() => void removeClubCard()}
              disabled={removing || saving}
              className="rounded-2xl border border-red-300/20 bg-red-400/10 px-5 py-3 text-sm font-black text-red-100 transition hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {removing ? "Verwijderen…" : "🗑 Club Card verwijderen"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-[1.75rem] border border-dashed border-white/15 bg-black/20 p-5 text-center">
          <div className="text-4xl">📱</div>

          <h3 className="mt-3 text-xl font-black text-white">
            Nog geen Club Card gekoppeld
          </h3>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/45">
            Geef de browser toegang tot je camera en richt de telefoon op de
            QR-code van je kaart.
          </p>

          <button
            type="button"
            onClick={() => void startScanner()}
            disabled={startingCamera || saving}
            className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {startingCamera ? "Camera starten…" : "📷 Club Card scannen"}
          </button>
        </div>
      )}

      {scannerOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/85 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clubcard-scanner-title"
        >
          <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] border border-white/15 bg-zinc-950 p-5 shadow-2xl sm:rounded-[2rem] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-200/70">
                  Club Card
                </p>

                <h2
                  id="clubcard-scanner-title"
                  className="mt-1 text-2xl font-black text-white"
                >
                  QR-code scannen
                </h2>
              </div>

              <button
                type="button"
                onClick={closeScanner}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl font-black text-white"
                aria-label="Scanner sluiten"
              >
                ×
              </button>
            </div>

            <div className="relative mt-5 aspect-[3/4] overflow-hidden rounded-3xl border border-amber-300/25 bg-black sm:aspect-video">
              <video
  ref={videoRef}
  className="h-full w-full object-cover"
  muted
  playsInline
  autoPlay
  controls={false}
/>

              <div className="pointer-events-none absolute inset-[14%] rounded-3xl border-2 border-amber-200/80 shadow-[0_0_0_999px_rgba(0,0,0,0.28)]">
                <span className="absolute left-4 right-4 top-1/2 h-px bg-amber-200/70 shadow-[0_0_12px_rgba(253,230,138,0.9)]" />
              </div>

              {startingCamera ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-black text-white">
                  Camera starten…
                </div>
              ) : null}
            </div>

            <p className="mt-4 text-center text-sm leading-6 text-white/45">
              Houd de QR-code binnen het kader. De link moet beginnen met
              <span className="font-bold text-white/70">
                {" "}eendracht-aalst-lede.eventpay.be/w/
              </span>
            </p>

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="text-sm font-black text-white">
                Werkt de camera niet?
              </p>

              <p className="mt-1 text-xs leading-5 text-white/40">
                Plak de volledige gescande link of vul alleen de code in.
              </p>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={manualValue}
                  onChange={(event) => setManualValue(event.target.value)}
                  placeholder="https://.../w/A12T4FG1"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="ucl-input flex-1"
                />

                <button
                  type="button"
                  onClick={() => void saveCode(manualValue)}
                  disabled={!manualValue.trim() || saving}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Opslaan…" : "Code opslaan"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
