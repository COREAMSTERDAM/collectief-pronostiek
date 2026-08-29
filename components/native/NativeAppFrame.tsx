"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AdminLayoutPreviewToggle from "@/components/admin/AdminLayoutPreviewToggle";
import AppShell from "@/components/native/AppShell";
import type { NativeNavItem } from "@/components/native/NativeBottomNav";
import MembershipAccessGate from "@/components/membership/MembershipAccessGate";
import { useAdminLayoutPreview } from "@/src/lib/use-admin-layout-preview";

const HIDE_NAV_PREFIXES = [
  "/login",
  "/registreren",
  "/wachtwoord-vergeten",
  "/wachtwoord-resetten",
  "/admin",
];

const FULLSCREEN_PREFIXES = ["/community/"];

const previewNavigation: NativeNavItem[] = [
  { href: "/", label: "Hub", icon: "⌂" },
  { href: "/admin/clubnieuws", label: "Nieuws", icon: "📰" },
  { href: "/matchcenter-preview", label: "Match", icon: "📅" },
  { href: "/club-card", label: "Club Card", icon: "💳" },
  { href: "/admin-keuze", label: "Beheer", icon: "⚙️" },
];

export default function NativeAppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { previewEnabled } = useAdminLayoutPreview();

  const hideBottomNav = HIDE_NAV_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const fullscreen = FULLSCREEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const showPreviewToggle = ![
    "/login",
    "/registreren",
    "/wachtwoord-vergeten",
    "/wachtwoord-resetten",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (fullscreen) {
    return <MembershipAccessGate>{children}</MembershipAccessGate>;
  }

  return (
    <MembershipAccessGate>
      <AppShell
        activeHref={pathname}
        hideBottomNav={hideBottomNav}
        navigation={previewEnabled ? previewNavigation : undefined}
        className={previewEnabled ? "admin-preview-shell" : ""}
      >
        {children}
      </AppShell>
      {showPreviewToggle ? <AdminLayoutPreviewToggle /> : null}
    </MembershipAccessGate>
  );
}
