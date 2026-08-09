"use client";

import { useState } from "react";
import NativeButton from "@/components/native/NativeButton";
import NativeCard from "@/components/native/NativeCard";
import NativeTopBar from "@/components/native/NativeTopBar";
import {
  useThemeSettings,
  type ThemeAnimations,
  type ThemeBackground,
  type ThemeCards,
  type ThemeIntensity,
  type ThemeMode,
  type ThemeRadius,
} from "@/components/theme/ThemeProvider";

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-2xl border px-3 py-3 text-sm font-black transition",
        active
          ? "border-[var(--user-accent)] bg-white/[0.08] text-white"
          : "border-white/10 bg-white/[0.04] text-white/65",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function AppUiterlijkPage() {
  const {
    settings,
    saving,
    updateSettings,
    saveSettings,
    resetSettings,
  } = useThemeSettings();

  const [message, setMessage] = useState("");

  async function handleSave() {
    try {
      setMessage("");
      await saveSettings();
      setMessage("Je app-uiterlijk is opgeslagen.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Opslaan is mislukt."
      );
    }
  }

  return (
    <div className="native-screen">
      <NativeTopBar
        eyebrow="Profiel"
        title="App uiterlijk"
        description="Pas de app aan naar jouw smaak. Alles wordt live toegepast."
        backHref="/profielkeuze"
        compact
      />

      <div className="mt-5 space-y-5">
        <NativeCard elevated>
          <p className="native-eyebrow">Live preview</p>

          <div className="mt-3 rounded-[var(--theme-radius)] border border-white/10 bg-[var(--user-bg)] p-4">
            <div className="rounded-2xl border border-white/10 bg-[var(--user-surface)] p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--user-accent-soft)]">
                Collectief
              </p>

              <h2 className="mt-2 text-xl font-black text-[var(--user-text)]">
                Zo ziet jouw thema eruit
              </h2>

              <p className="mt-2 text-sm text-[var(--user-muted)]">
                Knoppen, kaarten en navigatie volgen automatisch je instellingen.
              </p>

              <button
                type="button"
                className="mt-4 w-full rounded-xl bg-[var(--user-accent)] px-4 py-3 font-black text-black"
              >
                Voorbeeldknop
              </button>
            </div>
          </div>
        </NativeCard>

        <NativeCard>
          <p className="native-section-title">Primaire kleur</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <input
              type="color"
              value={settings.accent}
              onChange={(event) =>
                updateSettings({ accent: event.target.value })
              }
              className="h-14 w-full cursor-pointer rounded-2xl border border-white/10 bg-transparent"
            />

            <input
              type="text"
              value={settings.accent}
              onChange={(event) =>
                updateSettings({ accent: event.target.value })
              }
              className="ucl-input sm:w-36"
            />
          </div>

          <label className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div>
              <p className="font-black text-white">
                Tweede kleur gebruiken
              </p>
              <p className="mt-1 text-xs text-white/45">
                Voor gradients en extra accenten.
              </p>
            </div>

            <input
              type="checkbox"
              checked={settings.useSecondary}
              onChange={(event) =>
                updateSettings({
                  useSecondary: event.target.checked,
                })
              }
              className="h-5 w-5"
            />
          </label>

          {settings.useSecondary ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <input
                type="color"
                value={settings.secondary}
                onChange={(event) =>
                  updateSettings({
                    secondary: event.target.value,
                  })
                }
                className="h-14 w-full cursor-pointer rounded-2xl border border-white/10 bg-transparent"
              />

              <input
                type="text"
                value={settings.secondary}
                onChange={(event) =>
                  updateSettings({
                    secondary: event.target.value,
                  })
                }
                className="ucl-input sm:w-36"
              />
            </div>
          ) : null}
        </NativeCard>

        <NativeCard>
          <p className="native-section-title">Thema</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ["black", "Zwart"],
              ["dark", "Donker"],
              ["light", "Licht"],
              ["system", "Automatisch"],
            ].map(([value, label]) => (
              <OptionButton
                key={value}
                active={settings.mode === value}
                onClick={() =>
                  updateSettings({ mode: value as ThemeMode })
                }
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </NativeCard>

        <NativeCard>
          <p className="native-section-title">Kleursterkte</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["subtle", "Subtiel"],
              ["normal", "Normaal"],
              ["strong", "Fel"],
            ].map(([value, label]) => (
              <OptionButton
                key={value}
                active={settings.intensity === value}
                onClick={() =>
                  updateSettings({
                    intensity: value as ThemeIntensity,
                  })
                }
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </NativeCard>

        <NativeCard>
          <p className="native-section-title">Achtergrond</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["flat", "Vlak"],
              ["gradient", "Gradient"],
              ["glow", "Glow"],
            ].map(([value, label]) => (
              <OptionButton
                key={value}
                active={settings.background === value}
                onClick={() =>
                  updateSettings({
                    background: value as ThemeBackground,
                  })
                }
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </NativeCard>

        <NativeCard>
          <p className="native-section-title">Kaarten</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["standard", "Standaard"],
              ["glass", "Glass"],
              ["accent", "Accent"],
            ].map(([value, label]) => (
              <OptionButton
                key={value}
                active={settings.cards === value}
                onClick={() =>
                  updateSettings({ cards: value as ThemeCards })
                }
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </NativeCard>

        <NativeCard>
          <p className="native-section-title">Hoeken</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["compact", "Compact"],
              ["rounded", "Rond"],
              ["extra", "Extra rond"],
            ].map(([value, label]) => (
              <OptionButton
                key={value}
                active={settings.radius === value}
                onClick={() =>
                  updateSettings({ radius: value as ThemeRadius })
                }
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </NativeCard>

        <NativeCard>
          <p className="native-section-title">Animaties</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["full", "Volledig"],
              ["subtle", "Subtiel"],
              ["off", "Uit"],
            ].map(([value, label]) => (
              <OptionButton
                key={value}
                active={settings.animations === value}
                onClick={() =>
                  updateSettings({
                    animations: value as ThemeAnimations,
                  })
                }
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </NativeCard>

        {message ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-white/70">
            {message}
          </div>
        ) : null}

        <div className="grid gap-3">
          <NativeButton
            fullWidth
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Opslaan..." : "Uiterlijk opslaan"}
          </NativeButton>

          <NativeButton
            fullWidth
            variant="secondary"
            onClick={() => {
              void resetSettings();
              setMessage("Standaard uiterlijk hersteld.");
            }}
          >
            Standaard herstellen
          </NativeButton>
        </div>
      </div>
    </div>
  );
}
