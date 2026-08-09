"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/src/lib/supabase";

export type ThemeMode = "black" | "dark" | "light" | "system";
export type ThemeIntensity = "subtle" | "normal" | "strong";
export type ThemeBackground = "flat" | "gradient" | "glow";
export type ThemeCards = "standard" | "glass" | "accent";
export type ThemeAnimations = "full" | "subtle" | "off";
export type ThemeRadius = "compact" | "rounded" | "extra";

export type UserThemeSettings = {
  accent: string;
  secondary: string;
  useSecondary: boolean;
  mode: ThemeMode;
  intensity: ThemeIntensity;
  background: ThemeBackground;
  cards: ThemeCards;
  animations: ThemeAnimations;
  radius: ThemeRadius;
};

export const DEFAULT_THEME: UserThemeSettings = {
  accent: "#2ee68a",
  secondary: "#ffffff",
  useSecondary: false,
  mode: "black",
  intensity: "normal",
  background: "glow",
  cards: "standard",
  animations: "subtle",
  radius: "rounded",
};

type ThemeContextValue = {
  settings: UserThemeSettings;
  loading: boolean;
  saving: boolean;
  updateSettings: (next: Partial<UserThemeSettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 46, g: 230, b: 138 };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function mix(hex: string, target: "#000000" | "#ffffff", amount: number) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);

  const r = Math.round(a.r + (b.r - a.r) * amount);
  const g = Math.round(a.g + (b.g - a.g) * amount);
  const bl = Math.round(a.b + (b.b - a.b) * amount);

  return `#${[r, g, bl]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function resolveMode(mode: ThemeMode) {
  if (mode !== "system") return mode;
  if (typeof window === "undefined") return "black";

  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "black";
}

export function applyThemeToDocument(settings: UserThemeSettings) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const mode = resolveMode(settings.mode);
  const intensity =
    settings.intensity === "subtle"
      ? 0.55
      : settings.intensity === "strong"
        ? 1.35
        : 1;

  const accentSoft = mix(settings.accent, "#ffffff", 0.42);
  const accentDeep = mix(settings.accent, "#000000", 0.38);

  const background =
    mode === "light"
      ? "#f5f7f6"
      : mode === "dark"
        ? "#121212"
        : "#050505";

  const text = mode === "light" ? "#0b0b0b" : "#ffffff";
  const muted =
    mode === "light"
      ? "rgba(0,0,0,0.58)"
      : "rgba(255,255,255,0.46)";

  const surface =
    mode === "light"
      ? "rgba(0,0,0,0.045)"
      : "rgba(255,255,255,0.055)";

  const surfaceStrong =
    mode === "light"
      ? "rgba(0,0,0,0.075)"
      : "rgba(255,255,255,0.085)";

  root.style.setProperty("--user-accent", settings.accent);
  root.style.setProperty("--user-accent-soft", accentSoft);
  root.style.setProperty("--user-accent-deep", accentDeep);
  root.style.setProperty(
    "--user-accent-glow",
    rgba(settings.accent, Math.min(0.35, 0.18 * intensity))
  );
  root.style.setProperty(
    "--user-secondary",
    settings.useSecondary ? settings.secondary : settings.accent
  );
  root.style.setProperty("--user-bg", background);
  root.style.setProperty("--user-text", text);
  root.style.setProperty("--user-muted", muted);
  root.style.setProperty("--user-surface", surface);
  root.style.setProperty("--user-surface-strong", surfaceStrong);

  root.dataset.themeMode = mode;
  root.dataset.themeBackground = settings.background;
  root.dataset.themeCards = settings.cards;
  root.dataset.themeAnimations = settings.animations;
  root.dataset.themeRadius = settings.radius;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] =
    useState<UserThemeSettings>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cached = window.localStorage.getItem("collectief-theme");

    if (cached) {
      try {
        const parsed = {
          ...DEFAULT_THEME,
          ...JSON.parse(cached),
        } as UserThemeSettings;

        setSettings(parsed);
        applyThemeToDocument(parsed);
      } catch {
        applyThemeToDocument(DEFAULT_THEME);
      }
    } else {
      applyThemeToDocument(DEFAULT_THEME);
    }

    let mounted = true;

    async function loadRemote() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !mounted) return;

        const { data } = await supabase
          .from("profiles")
          .select("app_theme")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted || !data?.app_theme) return;

        const remote = {
          ...DEFAULT_THEME,
          ...(data.app_theme as Partial<UserThemeSettings>),
        };

        setSettings(remote);
        applyThemeToDocument(remote);
        window.localStorage.setItem(
          "collectief-theme",
          JSON.stringify(remote)
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadRemote();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    applyThemeToDocument(settings);
    window.localStorage.setItem(
      "collectief-theme",
      JSON.stringify(settings)
    );
  }, [settings]);

  const updateSettings = useCallback(
    (next: Partial<UserThemeSettings>) => {
      setSettings((current) => ({
        ...current,
        ...next,
      }));
    },
    []
  );

  const saveSettings = useCallback(async () => {
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Je moet ingelogd zijn om je app-uiterlijk op te slaan."
        );
      }

      const { error } = await supabase
        .from("profiles")
        .update({ app_theme: settings })
        .eq("id", user.id);

      if (error) throw error;

      window.localStorage.setItem(
        "collectief-theme",
        JSON.stringify(settings)
      );
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const resetSettings = useCallback(async () => {
    setSettings(DEFAULT_THEME);
    applyThemeToDocument(DEFAULT_THEME);
    window.localStorage.setItem(
      "collectief-theme",
      JSON.stringify(DEFAULT_THEME)
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({ app_theme: DEFAULT_THEME })
        .eq("id", user.id);
    }
  }, []);

  const value = useMemo(
    () => ({
      settings,
      loading,
      saving,
      updateSettings,
      saveSettings,
      resetSettings,
    }),
    [
      settings,
      loading,
      saving,
      updateSettings,
      saveSettings,
      resetSettings,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useThemeSettings moet binnen ThemeProvider gebruikt worden."
    );
  }

  return context;
}
