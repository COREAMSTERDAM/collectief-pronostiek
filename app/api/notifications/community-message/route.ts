import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import {
  createNotification,
  deliverNotificationPush,
} from "@/src/lib/notifications/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function previewMessage(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 130
    ? `${normalized.slice(0, 127)}…`
    : normalized;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const body = (await request.json()) as { messageId?: string };

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
          reply_to_message_id,
          deleted_at,
          community_channels (id, name)
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
        { error: "Je mag voor dit bericht geen melding aanmaken." },
        { status: 403 },
      );
    }

    if (message.deleted_at) {
      return NextResponse.json({ success: true, recipients: 0, sent: 0 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    const relation = Array.isArray(message.community_channels)
      ? message.community_channels[0]
      : message.community_channels;

    const channelName = relation?.name ?? "Community";
    const senderName = profile?.name?.trim() || "Een supporter";

    const { data: recipients, error: recipientError } =
      await supabaseAdmin.rpc("get_community_push_recipients", {
        target_channel_id: message.channel_id,
        sender_user_id: user.id,
      });

    if (recipientError) throw recipientError;

    const recipientUserIds = [
      ...new Set(
        (recipients ?? []).map(
          (recipient: { user_id: string }) => recipient.user_id,
        ),
      ),
    ];

    const { notificationId, recipientCount } =
      await createNotification({
        typeCode: message.reply_to_message_id
          ? "community_reply"
          : "community_message",
        sourceModule: "community",
        sourceId: message.id,
        title: channelName,
        body: `${senderName}: ${previewMessage(message.content)}`,
        icon: "💬",
        deepLink: `/community/${message.channel_id}#message-${message.id}`,
        senderUserId: user.id,
        metadata: {
          channelId: message.channel_id,
          messageId: message.id,
        },
        recipientUserIds,
      });

    if (!notificationId) {
      return NextResponse.json({
        success: true,
        recipients: 0,
        sent: 0,
      });
    }

    const delivery = await deliverNotificationPush(notificationId);

    return NextResponse.json({
      success: true,
      notificationId,
      recipients: recipientCount,
      ...delivery,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Communitymelding aanmaken mislukt.",
      },
      { status: 500 },
    );
  }
}
