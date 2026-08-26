"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

export type NativeNavItem = {
  href: string;
  label: string;
  icon: string;
  badge?: number;
};

const defaultItems: NativeNavItem[] = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/club-card", label: "Club Card", icon: "💳" },
  { href: "/pronostiekpagina", label: "Pronostiek", icon: "⚽" },
  { href: "/iedereencoachkeuze", label: "Coach", icon: "▣" },
  { href: "/profielkeuze", label: "Profiel", icon: "○" },
];

type NativeBottomNavProps = {
  items?: NativeNavItem[];
  activeHref?: string;
};

export default function NativeBottomNav({
  items = defaultItems,
  activeHref,
}: NativeBottomNavProps) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadAdminStatus() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) return;

      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (mounted) {
        setIsAdmin(Boolean(data?.is_admin));
      }
    }

    void loadAdminStatus();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) => item.href !== "/club-card" || isAdmin,
      ),
    [items, isAdmin],
  );

  return (
    <nav className="native-bottom-nav" aria-label="Hoofdnavigatie">
      <div className="native-bottom-nav-inner">
        {visibleItems.map((item) => {
          const active =
            activeHref === item.href ||
            (item.href !== "/" &&
              activeHref?.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`native-nav-item ${
                active ? "native-nav-item-active" : ""
              }`}
            >
              <span className="native-nav-icon">
                {item.icon}
                {item.badge && item.badge > 0 ? (
                  <span className="native-nav-badge">
                    {Math.min(item.badge, 99)}
                  </span>
                ) : null}
              </span>
              <span className="native-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
