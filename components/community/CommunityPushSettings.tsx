"use client";

import { useEffect, useMemo, useState } from "react";
import {
  disableCommunityPush,
  enableCommunityPush,
  getPushPermissionState,
  hasActivePushSubscription,
  type PushPermissionState,
} from "@/src/lib/community-push-client";
import {
  getMyCommunityStructure,
  type CommunityCategory,
} from "@/src/lib/community";
import { supabase } from "@/src/lib/supabase";

type ChannelSetting = {
  channel_id: number;
  is_muted: boolean;
};

type PreferencesPayload = {
  preference: {
    push_enabled: boolean;
    all_messages: boolean;
  };
  channel_settings: ChannelSetting[];
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Niet aangemeld.");
  }

  return session.access_token;
}

export default function CommunityPushSettings() {
  const [categories, setCategories] =
    useState<CommunityCategory[]>([]);
  const [mutedChannelIds, setMutedChannelIds] =
    useState<Set<number>>(new Set());
  const [permission, setPermission] =
    useState<PushPermissionState>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [allMessages, setAllMessages] = useState(true);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const channels = useMemo(
    () =>
      categories.flatMap((category) =>
        category.channels.map((channel) => ({
          ...channel,
          categoryName: category.name,
          categoryIcon: category.icon,
        })),
      ),
    [categories],
  );

  async function load() {
    try {
      setLoading(true);
      setErrorMessage("");

      const accessToken = await getAccessToken();

      const [structure, preferencesResponse] =
        await Promise.all([
          getMyCommunityStructure(),
          fetch("/api/community/push/preferences", {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }),
        ]);

      const payload =
        (await preferencesResponse.json()) as
          | PreferencesPayload
          | { error?: string };

      if (!preferencesResponse.ok) {
        throw new Error(
          "error" in payload
            ? payload.error
            : "Voorkeuren laden mislukt.",
        );
      }

      const preferences =
        payload as PreferencesPayload;

      setCategories(structure);
      setAllMessages(
        preferences.preference.all_messages,
      );
      setMutedChannelIds(
        new Set(
          preferences.channel_settings
            .filter((setting) => setting.is_muted)
            .map((setting) => setting.channel_id),
        ),
      );

      setPermission(getPushPermissionState());
      setSubscribed(
        await hasActivePushSubscription(),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Meldingsinstellingen laden mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patchPreference(
    body: Record<string, unknown>,
  ) {
    const accessToken = await getAccessToken();

    const response = await fetch(
      "/api/community/push/preferences",
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      },
    );

    const payload = (await response.json()) as {
      error?: string;
    };

    if (!response.ok) {
      throw new Error(
        payload.error ??
          "Meldingsvoorkeur opslaan mislukt.",
      );
    }
  }

  async function enable() {
    try {
      setWorking(true);
      setErrorMessage("");
      setMessage("");

      await enableCommunityPush();
      await patchPreference({
        pushEnabled: true,
        allMessages: true,
      });

      setPermission("granted");
      setSubscribed(true);
      setAllMessages(true);
      setMessage(
        "✅ Pushmeldingen voor communityberichten zijn ingeschakeld.",
      );
    } catch (error) {
      setPermission(getPushPermissionState());
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pushmeldingen inschakelen mislukt.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function disable() {
    try {
      setWorking(true);
      setErrorMessage("");
      setMessage("");

      await disableCommunityPush();
      await patchPreference({
        pushEnabled: false,
      });

      setSubscribed(false);
      setMessage(
        "Pushmeldingen zijn op dit toestel uitgeschakeld.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Pushmeldingen uitschakelen mislukt.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function toggleChannel(
    channelId: number,
  ) {
    const currentlyMuted =
      mutedChannelIds.has(channelId);
    const nextMuted = !currentlyMuted;

    setMutedChannelIds((current) => {
      const copy = new Set(current);

      if (nextMuted) {
        copy.add(channelId);
      } else {
        copy.delete(channelId);
      }

      return copy;
    });

    try {
      await patchPreference({
        channelId,
        isMuted: nextMuted,
      });
    } catch (error) {
      setMutedChannelIds((current) => {
        const copy = new Set(current);

        if (currentlyMuted) {
          copy.add(channelId);
        } else {
          copy.delete(channelId);
        }

        return copy;
      });

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kanaalvoorkeur opslaan mislukt.",
      );
    }
  }

  if (loading) {
    return (
      <section className="ucl-card text-center">
        <p className="ucl-muted">
          Meldingsinstellingen laden…
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="ucl-card">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-green-300/70">
              Community
            </p>

            <h2 className="mt-2 text-2xl font-black text-white">
              Pushmeldingen
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Ontvang bij ieder nieuw chatbericht de kanaalnaam als titel
              en de afzender met een korte berichtpreview.
            </p>
          </div>

          <span
            className={`inline-flex shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
              subscribed
                ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200"
                : "border-white/10 bg-white/5 text-white/40"
            }`}
          >
            {subscribed
              ? "● Actief"
              : "○ Niet actief"}
          </span>
        </div>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {message ? (
          <div className="mt-5 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-4 text-sm font-semibold text-emerald-100">
            {message}
          </div>
        ) : null}

        {permission === "unsupported" ? (
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-semibold text-amber-100">
            Pushmeldingen worden niet ondersteund in deze browser.
          </div>
        ) : permission === "denied" ? (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            Meldingen zijn door de browser geblokkeerd. Geef deze website
            opnieuw toestemming via de browser- of toestelinstellingen.
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {!subscribed ? (
            <button
              type="button"
              onClick={() => void enable()}
              disabled={
                working ||
                permission === "unsupported" ||
                permission === "denied"
              }
              className="ucl-button-primary !mt-0 disabled:opacity-40"
            >
              {working
                ? "Meldingen activeren…"
                : "🔔 Pushmeldingen activeren"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void disable()}
              disabled={working}
              className="rounded-2xl border border-red-300/20 bg-red-400/10 px-5 py-3 text-sm font-black text-red-100 disabled:opacity-40"
            >
              {working
                ? "Uitschakelen…"
                : "Pushmeldingen uitschakelen"}
            </button>
          )}

          <button
            type="button"
            disabled={!subscribed}
            onClick={async () => {
              const next = !allMessages;
              setAllMessages(next);

              try {
                await patchPreference({
                  allMessages: next,
                });
              } catch (error) {
                setAllMessages(!next);
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Voorkeur opslaan mislukt.",
                );
              }
            }}
            className="ucl-button-secondary disabled:opacity-35"
          >
            {allMessages
              ? "Alle chatberichten: aan"
              : "Alle chatberichten: uit"}
          </button>
        </div>
      </section>

      <section className="ucl-card">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
            Per kanaal
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            Kanalen dempen
          </h2>

          <p className="mt-2 text-sm text-white/40">
            Een gedempt kanaal blijft zichtbaar in de app, maar stuurt
            geen pushmeldingen.
          </p>
        </div>

        <div className="mt-5 space-y-2">
          {channels.map((channel) => {
            const muted =
              mutedChannelIds.has(channel.id);

            return (
              <button
                key={channel.id}
                type="button"
                onClick={() =>
                  void toggleChannel(channel.id)
                }
                disabled={!subscribed}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-left disabled:opacity-35"
              >
                <span className="text-lg">
                  {channel.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="font-black text-white">
                    {channel.name}
                  </p>

                  <p className="mt-1 text-xs text-white/35">
                    {channel.categoryIcon}{" "}
                    {channel.categoryName}
                  </p>
                </div>

                <span
                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase ${
                    muted
                      ? "border-red-300/20 bg-red-400/10 text-red-200"
                      : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                  }`}
                >
                  {muted ? "Gedempt" : "Aan"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs leading-5 text-white/40">
          Op iPhone werkt webpush nadat de app via Safari aan het
          beginscherm is toegevoegd. Meldingen worden alleen verstuurd
          voor kanalen waarvoor je toegang hebt. Je eigen berichten sturen
          nooit een push naar jezelf.
        </p>
      </section>
    </div>
  );
}
