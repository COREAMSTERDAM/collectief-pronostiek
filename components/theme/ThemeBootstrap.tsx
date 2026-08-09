"use client";

import { useEffect } from "react";
import {
  applyThemeToDocument,
  DEFAULT_THEME,
  type UserThemeSettings,
} from "@/components/theme/ThemeProvider";

export default function ThemeBootstrap() {
  useEffect(() => {
    const cached = window.localStorage.getItem("collectief-theme");

    if (!cached) {
      applyThemeToDocument(DEFAULT_THEME);
      return;
    }

    try {
      const parsed = {
        ...DEFAULT_THEME,
        ...JSON.parse(cached),
      } as UserThemeSettings;

      applyThemeToDocument(parsed);
    } catch {
      applyThemeToDocument(DEFAULT_THEME);
    }
  }, []);

  return null;
}
