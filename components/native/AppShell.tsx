"use client";

import type { ReactNode } from "react";
import NativeBottomNav, {
  type NativeNavItem,
} from "@/components/native/NativeBottomNav";

type AppShellProps = {
  children: ReactNode;
  navigation?: NativeNavItem[];
  activeHref?: string;
  hideBottomNav?: boolean;
  className?: string;
};

export default function AppShell({
  children,
  navigation,
  activeHref,
  hideBottomNav = false,
  className = "",
}: AppShellProps) {
  return (
    <main
      className={`native-app-shell ${className}`}
    >
      <div className="native-app-background" aria-hidden="true" />

      <div className="native-app-content">
        {children}
      </div>

      {!hideBottomNav ? (
        <NativeBottomNav
          items={navigation}
          activeHref={activeHref}
        />
      ) : null}
    </main>
  );
}
