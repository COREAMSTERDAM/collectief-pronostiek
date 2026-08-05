import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Recipient = {
  subscription_id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

function previewMessage(value: string) {
  const normalized = value
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length > 130
    ? `${normalized.slice(0, 127)}…`
    : normalized;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    const publicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey =
      process.env.VAPID_PRIVATE_KEY;
    const subject =
      process.env.VAPID_SUBJECT;

    if (!publicKey || !privateKey || !subject) {
      throw new Error(
        "De VAPID-omgevingsvariabelen zijn niet volledig ingesteld.",
      );
    }

    const body = (await request.json()) as {
      messageId?: string;
    };

    if (!body.messageId) {
      return NextResponse.json(
        { error: "Bericht-ID ontbreekt." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: message, error: messageError } =
      await supabaseAdmin
        .from("community_messages")
        .select(`
          id,
          channel_id,
          user_id,
          content,
          deleted_at,
          community_channels (
            id,
            name
          )
        `)
        .eq("id", body.messageId)
        .single();

    if (messageError || !message) {
      return NextResponse.json(
        { error: "Bericht niet gevonden." },
        { status: 404 },
      );
    }

    if (message.user_id !== user.id) {
      return NextResponse.json(
        { error: "Je mag voor dit bericht geen push versturen." },
        { status: 403 },
      );
    }

    if (message.deleted_at) {
      return NextResponse.json(
        { success: true, sent: 0 },
      );
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const channelRelation = Array.isArray(
      message.community_channels,
    )
      ? message.community_channels[0]
      : message.community_channels;

    const channelName =
      channelRelation?.name ?? "Community";
    const senderName =
      profile?.name?.trim() || "Een supporter";

    const { data: recipients, error: recipientError } =
      await supabaseAdmin.rpc(
        "get_community_push_recipients",
        {
          target_channel_id: message.channel_id,
          sender_user_id: user.id,
        },
      );

    if (recipientError) throw recipientError;

    webpush.setVapidDetails(
      subject,
      publicKey,
      privateKey,
    );

    const notificationPayload = JSON.stringify({
      title: channelName,
      body: `${senderName}: ${previewMessage(
        message.content,
      )}`,
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: `community-channel-${message.channel_id}`,
      renotify: true,
      data: {
        url: `/community/${message.channel_id}#message-${message.id}`,
        channelId: message.channel_id,
        messageId: message.id,
      },
    });

    const results = await Promise.allSettled(
      ((recipients ?? []) as Recipient[]).map(
        async (recipient) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: recipient.endpoint,
                keys: {
                  p256dh: recipient.p256dh,
                  auth: recipient.auth_secret,
                },
              },
              notificationPayload,
              {
                TTL: 60 * 60,
                urgency: "high",
              },
            );

            await supabaseAdmin
              .from("community_push_subscriptions")
              .update({
                last_success_at:
                  new Date().toISOString(),
                failure_count: 0,
                last_failure_at: null,
              })
              .eq("id", recipient.subscription_id);

            return true;
          } catch (error) {
            const statusCode =
              typeof error === "object" &&
              error !== null &&
              "statusCode" in error
                ? Number(error.statusCode)
                : null;

            if (statusCode === 404 || statusCode === 410) {
              await supabaseAdmin
                .from("community_push_subscriptions")
                .update({
                  is_active: false,
                  last_failure_at:
                    new Date().toISOString(),
                  failure_count: 99,
                })
                .eq("id", recipient.subscription_id);
            } else {
              const { data: current } =
                await supabaseAdmin
                  .from("community_push_subscriptions")
                  .select("failure_count")
                  .eq("id", recipient.subscription_id)
                  .maybeSingle();

              await supabaseAdmin
                .from("community_push_subscriptions")
                .update({
                  last_failure_at:
                    new Date().toISOString(),
                  failure_count:
                    (current?.failure_count ?? 0) + 1,
                })
                .eq("id", recipient.subscription_id);
            }

            throw error;
          }
        },
      ),
    );

    const sent = results.filter(
      (result) => result.status === "fulfilled",
    ).length;

    return NextResponse.json({
      success: true,
      sent,
      failed: results.length - sent,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pushmeldingen versturen mislukt.",
      },
      { status: 500 },
    );
  }
}
