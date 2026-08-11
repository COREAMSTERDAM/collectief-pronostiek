"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import {
  isMembershipBypassPath,
  routeKeyForPath,
} from "@/src/lib/membership-routes";
import MembershipRequiredScreen from "@/components/membership/MembershipRequiredScreen";

type Access = {
  is_admin: boolean;
  level_key: string;
  level_name: string;
  expires_at: string | null;
  source: string;
  routes: string[];
};

export default function MembershipAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Access | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

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

        if (mounted) {
          setAccess(data as Access);
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

  if (
    access &&
    !access.is_admin &&
    routeKey &&
    !access.routes.includes(routeKey)
  ) {
    return (
      <MembershipRequiredScreen
        levelName={access.level_name}
        expiresAt={access.expires_at}
      />
    );
  }

  return <>{children}</>;
}
