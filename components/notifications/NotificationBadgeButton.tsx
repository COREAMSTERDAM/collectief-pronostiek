"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getNotificationUnreadCount } from "@/src/lib/notifications/client";
import { supabase } from "@/src/lib/supabase";

type NotificationBadgeButtonProps = {
  className?: string;
  label?: string;
};

export default function NotificationBadgeButton({
  className = "",
  label = "Meldingen",
}: NotificationBadgeButtonProps) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    try {
      setCount(await getNotificationUnreadCount());
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void load();

    const channel = supabase
      .channel("notification-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification_recipients",
        },
        () => void load(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <Link
      href="/meldingen"
      className={`relative inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-black text-white transition active:scale-95 ${className}`}
      aria-label={`${label}${count > 0 ? `, ${count} ongelezen` : ""}`}
    >
      <span>🔔</span>
      <span>{label}</span>

      {count > 0 ? (
        <span className="absolute -right-2 -top-2 flex min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 py-1 text-[10px] font-black text-white shadow-lg shadow-red-950/40">
          {Math.min(count, 99)}
        </span>
      ) : null}
    </Link>
  );
}
