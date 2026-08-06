"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";

export type CommunityPresenceUser = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  onlineAt: string;
};

type TypingPayload = {
  userId: string;
  name: string;
  sentAt: number;
};

type UseCommunityRealtimeOptions = {
  channelId: number;
  currentUserId: string | null;
  currentUserName: string;
  currentUserAvatarUrl?: string | null;
};

export function useCommunityRealtime({
  channelId,
  currentUserId,
  currentUserName,
  currentUserAvatarUrl = null,
}: UseCommunityRealtimeOptions) {
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutsRef = useRef<Map<string, number>>(new Map());
  const lastTypingBroadcastRef = useRef(0);

  const [onlineUsers, setOnlineUsers] = useState<
    CommunityPresenceUser[]
  >([]);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; name: string }>
  >([]);

  const clearTypingUser = useCallback((userId: string) => {
    const timeout = typingTimeoutsRef.current.get(userId);

    if (timeout) {
      window.clearTimeout(timeout);
      typingTimeoutsRef.current.delete(userId);
    }

    setTypingUsers((current) =>
      current.filter((user) => user.userId !== userId),
    );
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const realtimeChannel = supabase.channel(
      `community-live-${channelId}`,
      {
        config: {
          presence: {
            key: currentUserId,
          },
          broadcast: {
            self: false,
          },
        },
      },
    );

    realtimeChannelRef.current = realtimeChannel;

    realtimeChannel
      .on("presence", { event: "sync" }, () => {
        const state = realtimeChannel.presenceState();

        const users = Object.values(state)
          .flat()
          .map((entry) => {
            const value = entry as unknown as {
              userId?: string;
              name?: string;
              avatarUrl?: string | null;
              onlineAt?: string;
            };

            return {
              userId: value.userId ?? "",
              name: value.name ?? "Supporter",
              avatarUrl: value.avatarUrl ?? null,
              onlineAt:
                value.onlineAt ?? new Date().toISOString(),
            };
          })
          .filter(
            (user): user is CommunityPresenceUser =>
              Boolean(user.userId),
          );

        const uniqueUsers = Array.from(
          new Map(
            users.map((user) => [user.userId, user]),
          ).values(),
        );

        setOnlineUsers(uniqueUsers);
      })
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }) => {
          const value = payload as TypingPayload;

          if (
            !value.userId ||
            value.userId === currentUserId
          ) {
            return;
          }

          setTypingUsers((current) => {
            const exists = current.some(
              (user) => user.userId === value.userId,
            );

            if (exists) {
              return current.map((user) =>
                user.userId === value.userId
                  ? {
                      userId: value.userId,
                      name: value.name || "Supporter",
                    }
                  : user,
              );
            }

            return [
              ...current,
              {
                userId: value.userId,
                name: value.name || "Supporter",
              },
            ];
          });

          const existingTimeout =
            typingTimeoutsRef.current.get(value.userId);

          if (existingTimeout) {
            window.clearTimeout(existingTimeout);
          }

          const timeout = window.setTimeout(() => {
            clearTypingUser(value.userId);
          }, 3200);

          typingTimeoutsRef.current.set(
            value.userId,
            timeout,
          );
        },
      )
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;

        await realtimeChannel.track({
          userId: currentUserId,
          name: currentUserName || "Supporter",
          avatarUrl: currentUserAvatarUrl,
          onlineAt: new Date().toISOString(),
        });
      });

    return () => {
      for (const timeout of typingTimeoutsRef.current.values()) {
        window.clearTimeout(timeout);
      }

      typingTimeoutsRef.current.clear();
      realtimeChannelRef.current = null;
      void supabase.removeChannel(realtimeChannel);
    };
  }, [
    channelId,
    clearTypingUser,
    currentUserAvatarUrl,
    currentUserId,
    currentUserName,
  ]);

  const broadcastTyping = useCallback(() => {
    if (!currentUserId || !realtimeChannelRef.current) {
      return;
    }

    const now = Date.now();

    // Hoogstens één typing-event per 900 ms.
    if (now - lastTypingBroadcastRef.current < 900) {
      return;
    }

    lastTypingBroadcastRef.current = now;

    void realtimeChannelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: {
        userId: currentUserId,
        name: currentUserName || "Supporter",
        sentAt: now,
      } satisfies TypingPayload,
    });
  }, [currentUserId, currentUserName]);

  const typingLabel = useMemo(() => {
    if (typingUsers.length === 0) return "";

    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is aan het typen…`;
    }

    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} en ${typingUsers[1].name} zijn aan het typen…`;
    }

    return `${typingUsers.length} mensen zijn aan het typen…`;
  }, [typingUsers]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    typingUsers,
    typingLabel,
    broadcastTyping,
  };
}
