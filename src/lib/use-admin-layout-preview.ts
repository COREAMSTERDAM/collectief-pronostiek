"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

const STORAGE_KEY = "collectief_admin_layout_mode";
const CHANGE_EVENT = "collectief-admin-layout-change";

type LayoutMode = "current" | "preview";

function readStoredMode(): LayoutMode {
  if (typeof window === "undefined") return "current";
  return window.localStorage.getItem(STORAGE_KEY) === "preview"
    ? "preview"
    : "current";
}

export function useAdminLayoutPreview() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [mode, setModeState] = useState<LayoutMode>("current");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) return;

        const { data } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .maybeSingle();

        if (!mounted) return;

        const admin = data?.is_admin === true;
        setIsAdmin(admin);
        setModeState(admin ? readStoredMode() : "current");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    const sync = () => setModeState(readStoredMode());
    window.addEventListener("storage", sync);
    window.addEventListener(CHANGE_EVENT, sync);

    return () => {
      mounted = false;
      window.removeEventListener("storage", sync);
      window.removeEventListener(CHANGE_EVENT, sync);
    };
  }, []);

  const setMode = useCallback(
    (nextMode: LayoutMode) => {
      if (!isAdmin || typeof window === "undefined") return;
      window.localStorage.setItem(STORAGE_KEY, nextMode);
      setModeState(nextMode);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [isAdmin],
  );

  return {
    isAdmin,
    loading,
    mode,
    previewEnabled: isAdmin && mode === "preview",
    setMode,
  };
}
