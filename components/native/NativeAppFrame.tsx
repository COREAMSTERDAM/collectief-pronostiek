"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "@/components/native/AppShell";
import MembershipAccessGate from "@/components/membership/MembershipAccessGate";

const HIDE_NAV_PREFIXES = [
  "/login",
  "/registreren",
  "/wachtwoord-vergeten",
  "/wachtwoord-resetten",
  "/admin",
];

const FULLSCREEN_PREFIXES = [
  "/community/",
];

export default function NativeAppFrame({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  const hideBottomNav = HIDE_NAV_PREFIXES.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  const fullscreen = FULLSCREEN_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (fullscreen) {
    return <MembershipAccessGate>{children}</MembershipAccessGate>;
  }

  return (
    <MembershipAccessGate>
    <AppShell
      activeHref={pathname}
      hideBottomNav={hideBottomNav}
    >
      {children}
    </AppShell>
    </MembershipAccessGate>
  );
}
