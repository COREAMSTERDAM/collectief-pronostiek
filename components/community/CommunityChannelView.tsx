"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createCommunityMessage,
  deleteCommunityMessage,
  getCommunityChannel,
  getCommunityMessages,
  toggleCommunityMessagePin,
  updateCommunityMessage,
  type CommunityChannelDetail,
  type CommunityMessage,
} from "@/src/lib/community-chat";
import { supabase } from "@/src/lib/supabase";
import {
  markCommunityChannelRead,
  toggleCommunityReaction,
} from "@/src/lib/community-experience";
import { useCommunityRealtime } from "@/src/lib/community/useCommunityRealtime";

type CommunityChannelViewProps = {
  channelId: number;
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "⚽", "👏"];

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export default function CommunityChannelView({
  channelId,
}: CommunityChannelViewProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLElement | null>(null);
  const [channel, setChannel] =
    useState<CommunityChannelDetail | null>(null);
  const [messages, setMessages] =
    useState<CommunityMessage[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] =
    useState<CommunityMessage | null>(null);
  const [editing, setEditing] =
    useState<CommunityMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [reactionPickerMessageId, setReactionPickerMessageId] =
    useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null>(null);

  const {
    onlineUsers,
    onlineCount,
    typingLabel,
    broadcastTyping,
  } = useCommunityRealtime({
    channelId,
    currentUserId: currentUser?.id ?? null,
    currentUserName: currentUser?.name ?? "Supporter",
    currentUserAvatarUrl: currentUser?.avatarUrl ?? null,
  });

  const pinnedMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.is_pinned && message.deleted_at === null,
      ),
    [messages],
  );

  const loadMessages = useCallback(
    async (scrollToBottom = false) => {
      try {
        const result = await getCommunityMessages(channelId);
        setMessages(result);

        if (scrollToBottom) {
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              const container = messagesScrollRef.current;

              if (container) {
                container.scrollTop =
                  container.scrollHeight;
              } else {
                bottomRef.current?.scrollIntoView({
                  behavior: "auto",
                  block: "end",
                });
              }
            });
          });
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Berichten laden mislukt.",
        );
      }
    },
    [channelId],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setErrorMessage("");

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          window.location.href =
            "/login?reason=login-required";
          return;
        }

        const metadataName =
          typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : user.email?.split("@")[0] ?? "Supporter";

        const metadataAvatar =
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null;

        setCurrentUser({
          id: user.id,
          name: metadataName,
          avatarUrl: metadataAvatar,
        });

        const channelResult =
          await getCommunityChannel(channelId);

        if (!mounted) return;

        if (!channelResult) {
          throw new Error(
            "Dit kanaal bestaat niet of je hebt geen toegang.",
          );
        }

        setChannel(channelResult);
        await loadMessages(true);
        await markCommunityChannelRead(channelId);
      } catch (error) {
        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Kanaal laden mislukt.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [channelId, loadMessages]);

  useEffect(() => {
    const subscription = supabase
      .channel(`community-channel-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          void loadMessages(false);
          void markCommunityChannelRead(channelId);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "community_message_reactions",
        },
        () => {
          void loadMessages(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [channelId, loadMessages]);

  async function submit(event: FormEvent) {
    event.preventDefault();

    const trimmed = content.trim();

    if (!trimmed || sending || !channel?.can_post) return;

    try {
      setSending(true);
      setErrorMessage("");

      if (editing) {
        await updateCommunityMessage(editing.id, trimmed);
      } else {
        await createCommunityMessage({
          channelId,
          content: trimmed,
          replyToMessageId: replyTo?.id ?? null,
        });
      }

      setContent("");
      setEditing(null);
      setReplyTo(null);
      await loadMessages(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Bericht opslaan mislukt.",
      );
    } finally {
      setSending(false);
    }
  }

  function startEdit(message: CommunityMessage) {
    setEditing(message);
    setReplyTo(null);
    setContent(message.content);
  }

  function cancelComposerMode() {
    setEditing(null);
    setReplyTo(null);
    setContent("");
  }

  if (loading) {
    return (
      <div className="ucl-card text-center">
        <p className="ucl-muted">Kanaal laden…</p>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="ucl-card text-center">
        <h1 className="text-xl font-black text-white">
          Kanaal niet beschikbaar
        </h1>

        <p className="ucl-subtitle">{errorMessage}</p>

        <Link
          href="/community"
          className="ucl-button-secondary"
        >
          Terug naar community
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col">
      <header className="z-20 shrink-0 border-b border-white/10 bg-black/90 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href="/community"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl font-black"
            aria-label="Terug naar community"
          >
            ←
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-amber-200/60">
              {channel.category_icon} {channel.category_name}
            </p>

            <h1 className="truncate text-xl font-black text-white sm:text-2xl">
              {channel.icon} {channel.name}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div
              className="hidden items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-400/[0.08] px-3 py-2 sm:flex"
              title={onlineUsers
                .map((user) => user.name)
                .join(", ")}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
              <span className="text-[10px] font-black uppercase text-emerald-100/70">
                {onlineCount} online
              </span>
            </div>

            {channel.is_read_only ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase text-white/40">
                Alleen lezen
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main
        ref={messagesScrollRef}
        className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
      >
        {channel.description ? (
          <section className="mb-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-sm leading-6 text-white/50">
              {channel.description}
            </p>
          </section>
        ) : null}

        {pinnedMessages.length > 0 ? (
          <section className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200/70">
              📌 Vastgepind
            </p>

            <div className="mt-3 space-y-2">
              {pinnedMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() =>
                    document
                      .getElementById(`message-${message.id}`)
                      ?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })
                  }
                  className="block w-full truncate rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left text-sm font-semibold text-white/65"
                >
                  {message.user_name}: {message.content}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm font-semibold text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <section className="flex-1 space-y-3">
          {messages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
              <div className="text-4xl">💬</div>

              <h2 className="mt-4 text-xl font-black text-white">
                Nog geen berichten
              </h2>

              <p className="mt-2 text-sm text-white/40">
                Start de eerste discussie in dit kanaal.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                id={`message-${message.id}`}
                key={message.id}
                className={`community-message-enter group rounded-2xl border p-4 transition ${
                  message.is_pinned
                    ? "border-amber-300/25 bg-amber-300/[0.06]"
                    : "border-white/10 bg-white/[0.035]"
                } ${
                  message.deleted_at
                    ? "opacity-55"
                    : "hover:border-white/20"
                }`}
              >
                {message.reply_to ? (
                  <div className="mb-3 rounded-xl border-l-2 border-amber-300/50 bg-black/25 px-3 py-2">
                    <p className="text-[11px] font-black text-amber-200/70">
                      ↩ {message.reply_to.user_name}
                    </p>

                    <p className="mt-1 truncate text-xs text-white/40">
                      {message.reply_to.content}
                    </p>
                  </div>
                ) : null}

                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-black text-xs font-black text-white">
                    {message.user_avatar_url ? (
                      <img
                        src={message.user_avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      initials(message.user_name)
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-black text-white">
                        {message.user_name}
                      </p>

                      <p className="text-[11px] font-semibold text-white/30">
                        {formatMessageTime(message.created_at)}
                      </p>

                      {message.is_edited ? (
                        <span className="text-[10px] font-semibold text-white/25">
                          bewerkt
                        </span>
                      ) : null}

                      {message.is_pinned ? (
                        <span className="text-xs">📌</span>
                      ) : null}
                    </div>

                    <p
                      className={`mt-2 whitespace-pre-wrap break-words text-sm leading-6 ${
                        message.deleted_at
                          ? "italic text-white/35"
                          : "text-white/75"
                      }`}
                    >
                      {message.content}
                    </p>
                  </div>
                </div>

                {!message.deleted_at ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2 pl-14">
                      {message.reactions.map((reaction) => (
                        <button
                          key={reaction.emoji}
                          type="button"
                          onClick={async () => {
                            try {
                              await toggleCommunityReaction(
                                message.id,
                                reaction.emoji,
                              );
                              await loadMessages(false);
                            } catch (error) {
                              setErrorMessage(
                                error instanceof Error
                                  ? error.message
                                  : "Reactie opslaan mislukt.",
                              );
                            }
                          }}
                          className={`rounded-full border px-2.5 py-1 text-xs font-black transition ${
                            reaction.reacted_by_me
                              ? "border-amber-300/35 bg-amber-300/15 text-amber-100"
                              : "border-white/10 bg-white/5 text-white/55"
                          }`}
                        >
                          {reaction.emoji} {reaction.count}
                        </button>
                      ))}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setReactionPickerMessageId((current) =>
                              current === message.id ? null : message.id,
                            )
                          }
                          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-black text-white/45"
                          aria-label="Reactie toevoegen"
                        >
                          ＋ 🙂
                        </button>

                        {reactionPickerMessageId === message.id ? (
                          <div className="absolute bottom-full left-0 z-30 mb-2 flex gap-1 rounded-2xl border border-white/10 bg-zinc-950 p-2 shadow-2xl">
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={async () => {
                                  try {
                                    await toggleCommunityReaction(
                                      message.id,
                                      emoji,
                                    );
                                    setReactionPickerMessageId(null);
                                    await loadMessages(false);
                                  } catch (error) {
                                    setErrorMessage(
                                      error instanceof Error
                                        ? error.message
                                        : "Reactie opslaan mislukt.",
                                    );
                                  }
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-white/10 active:scale-90"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 pl-14 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    {channel.can_post ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReplyTo(message);
                          setEditing(null);
                          setContent("");
                        }}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-black text-white/55"
                      >
                        ↩ Antwoorden
                      </button>
                    ) : null}

                    {message.is_own ? (
                      <button
                        type="button"
                        onClick={() => startEdit(message)}
                        className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-black text-white/55"
                      >
                        ✏ Bewerken
                      </button>
                    ) : null}

                    {message.is_own || message.can_moderate ? (
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Wil je dit bericht verwijderen?",
                            )
                          ) {
                            return;
                          }

                          try {
                            await deleteCommunityMessage(message.id);
                            await loadMessages(false);
                          } catch (error) {
                            setErrorMessage(
                              error instanceof Error
                                ? error.message
                                : "Verwijderen mislukt.",
                            );
                          }
                        }}
                        className="rounded-lg border border-red-300/15 bg-red-400/10 px-2.5 py-1.5 text-[11px] font-black text-red-200/75"
                      >
                        🗑 Verwijderen
                      </button>
                    ) : null}

                    {message.can_moderate ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await toggleCommunityMessagePin(message.id);
                            await loadMessages(false);
                          } catch (error) {
                            setErrorMessage(
                              error instanceof Error
                                ? error.message
                                : "Vastpinnen mislukt.",
                            );
                          }
                        }}
                        className="rounded-lg border border-amber-300/15 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-black text-amber-100/75"
                      >
                        📌 {message.is_pinned ? "Losmaken" : "Vastpinnen"}
                      </button>
                    ) : null}
                    </div>
                  </>
                ) : null}
              </article>
            ))
          )}

          <div ref={bottomRef} />
        </section>
      </main>

      <footer className="z-30 shrink-0 border-t border-white/10 bg-black/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto max-w-5xl">
          {channel.can_post ? (
            <form onSubmit={submit}>
              {replyTo || editing ? (
                <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black text-amber-200/70">
                      {editing
                        ? `Bericht bewerken`
                        : `Antwoord op ${replyTo?.user_name}`}
                    </p>

                    <p className="mt-1 truncate text-xs text-white/35">
                      {editing?.content ?? replyTo?.content}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={cancelComposerMode}
                    className="text-lg font-black text-white/45"
                    aria-label="Annuleren"
                  >
                    ×
                  </button>
                </div>
              ) : null}

              <div className="flex items-end gap-3">
                <textarea
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);

                    if (event.target.value.trim()) {
                      broadcastTyping();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={4000}
                  placeholder={`Bericht aan #${channel.name}`}
                  onFocus={() => {
                    window.setTimeout(() => {
                      const container =
                        messagesScrollRef.current;

                      if (container) {
                        container.scrollTop =
                          container.scrollHeight;
                      }
                    }, 150);
                  }}
                  className="w-full rounded-2xl bg-black/20 p-4 text-base text-white"
                />

                <button
                  type="submit"
                  disabled={!content.trim() || sending}
                  className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-white px-5 text-sm font-black text-black transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {sending
                    ? "…"
                    : editing
                      ? "Opslaan"
                      : "Verstuur"}
                </button>
              </div>

              <div className="mt-2 min-h-4">
                {typingLabel ? (
                  <p className="flex items-center gap-2 text-[11px] font-semibold text-emerald-200/65">
                    <span className="inline-flex gap-0.5">
                      <span className="community-typing-dot">•</span>
                      <span className="community-typing-dot [animation-delay:150ms]">•</span>
                      <span className="community-typing-dot [animation-delay:300ms]">•</span>
                    </span>
                    {typingLabel}
                  </p>
                ) : (
                  <p className="text-[10px] font-semibold text-white/25">
                    Enter verstuurt · Shift+Enter maakt een nieuwe regel
                  </p>
                )}
              </div>
            </form>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center text-sm font-bold text-white/40">
              🔒 Je kunt dit kanaal bekijken, maar hier geen berichten
              plaatsen.
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
