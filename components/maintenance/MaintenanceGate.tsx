"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";

type Settings = {
  maintenance_mode: boolean;
  maintenance_title: string | null;
  maintenance_message: string | null;
  maintenance_logo_url: string | null;
};

const ALWAYS_ALLOWED = [
  "/login",
  "/wachtwoord-vergeten",
  "/wachtwoord-resetten",
  "/admin/onderhoud",
];

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const { data } = await supabase
          .from("app_settings")
          .select("maintenance_mode, maintenance_title, maintenance_message, maintenance_logo_url")
          .eq("id", 1)
          .maybeSingle();

        if (!mounted) return;

        const current: Settings = {
          maintenance_mode: Boolean(data?.maintenance_mode),
          maintenance_title: data?.maintenance_title ?? null,
          maintenance_message: data?.maintenance_message ?? null,
          maintenance_logo_url: data?.maintenance_logo_url ?? null,
        };

        setSettings(current);

        if (!current.maintenance_mode) {
          setAllowed(true);
          return;
        }

        if (ALWAYS_ALLOWED.some((prefix) =>
          pathname === prefix || pathname.startsWith(`${prefix}/`)
        )) {
          setAllowed(true);
          return;
        }

        const { data: authData } = await supabase.auth.getUser();
        const user = authData.user;

        if (!user) {
          setAllowed(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, maintenance_access")
          .eq("id", user.id)
          .maybeSingle();

        setAllowed(
          profile?.is_admin === true ||
          profile?.maintenance_access === true
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [pathname]);

  if (loading) {
    return (
      <main className="maintenance-screen">
        <section className="maintenance-panel maintenance-loading">
          App laden…
        </section>
      </main>
    );
  }

  if (settings?.maintenance_mode && !allowed) {
    return (
      <MaintenanceScreen
        title={settings.maintenance_title ?? undefined}
        message={settings.maintenance_message ?? undefined}
        logoUrl={settings.maintenance_logo_url}
      />
    );
  }

  return <>{children}</>;
}
