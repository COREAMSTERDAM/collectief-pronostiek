"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import {
  isMembershipBypassPath,
  routeKeyForPath,
} from "@/src/lib/membership-routes";
import MembershipRequiredScreen from "@/components/membership/MembershipRequiredScreen";

type PreviewLevel = "guest" | "white_member" | "black_member";

type Access = {
  is_admin: boolean;
  level_key: string;
  level_name: string;
  expires_at: string | null;
  source: string;
  routes: string[];
};

type RouteAccessRow = {
  route_key: string;
  allowed: boolean;
};

const PREVIEW_STORAGE_KEY = "cwz_admin_membership_preview";

const PREVIEW_LABELS: Record<PreviewLevel, string> = {
  guest: "Gast",
  white_member: "White Member",
  black_member: "Black Member",
};

function isPreviewLevel(value: string | null): value is PreviewLevel {
  return (
    value === "guest" ||
    value === "white_member" ||
    value === "black_member"
  );
}

export default function MembershipAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Access | null>(null);
  const [realIsAdmin, setRealIsAdmin] = useState(false);
  const [previewLevel, setPreviewLevel] =
    useState<PreviewLevel | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setPreviewLevel(null);
        setRealIsAdmin(false);

        if (isMembershipBypassPath(pathname)) {
          if (mounted) setAccess(null);
          return;
        }

        const routeKey = routeKeyForPath(pathname);

        // Routes die niet in het membershipmodel staan, blijven standaard vrij.
        if (!routeKey) {
          if (mounted) setAccess(null);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
          return;
        }

        const { data, error } = await supabase.rpc(
          "get_my_membership_access",
        );

        if (error) {
          throw error;
        }

        const realAccess = data as Access;
        const admin = Boolean(realAccess?.is_admin);

        if (mounted) {
          setRealIsAdmin(admin);
        }

        // Alleen een ECHTE admin mag previewmodus gebruiken.
        const storedPreview =
          typeof window !== "undefined"
            ? window.sessionStorage.getItem(PREVIEW_STORAGE_KEY)
            : null;

        if (admin && isPreviewLevel(storedPreview)) {
          const { data: routeRows, error: routeError } = await supabase
            .from("membership_route_access")
            .select("route_key, allowed")
            .eq("membership_level_key", storedPreview);

          if (routeError) {
            throw routeError;
          }

          const routes = (
            (routeRows ?? []) as RouteAccessRow[]
          )
            .filter((row) => row.allowed)
            .map((row) => row.route_key);

          if (mounted) {
            setPreviewLevel(storedPreview);
            setAccess({
              is_admin: false,
              level_key: storedPreview,
              level_name: PREVIEW_LABELS[storedPreview],
              expires_at: null,
              source: "admin_preview",
              routes,
            });
          }

          return;
        }

        if (mounted) {
          setAccess(realAccess);
        }
      } catch (error) {
        console.error("Membershiptoegang laden mislukt:", error);

        if (mounted) {
          setAccess({
            is_admin: false,
            level_key: "guest",
            level_name: "Gast",
            expires_at: null,
            source: "error",
            routes: [],
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [pathname]);

  function stopPreview() {
    window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    window.location.reload();
  }

  if (loading) {
    return (
      <main className="membership-required-screen">
        <section className="membership-required-card membership-required-loading">
          Toegang controleren…
        </section>
      </main>
    );
  }

  const routeKey = routeKeyForPath(pathname);

  const content =
    access &&
    !access.is_admin &&
    routeKey &&
    !access.routes.includes(routeKey) ? (
      <MembershipRequiredScreen
        levelName={access.level_name}
        expiresAt={access.expires_at}
      />
    ) : (
      <>{children}</>
    );

  return (
    <>
      {realIsAdmin && previewLevel ? (
        <div className="fixed inset-x-0 top-0 z-[9999] border-b border-amber-300/20 bg-black/95 px-3 py-2 text-white shadow-xl backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                Admin preview · {PREVIEW_LABELS[previewLevel]}
              </p>
              <p className="truncate text-[11px] text-white/45">
                Je ziet de membershiptoegang alsof je dit type gebruiker bent.
              </p>
            </div>

            <button
              type="button"
              onClick={stopPreview}
              className="shrink-0 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-black text-white"
            >
              Preview stoppen
            </button>
          </div>
        </div>
      ) : null}

      <div className={realIsAdmin && previewLevel ? "pt-[58px]" : undefined}>
        {content}
      </div>
    </>
  );
}
