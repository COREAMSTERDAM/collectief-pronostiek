import "server-only";

import webpush from "web-push";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type CreateNotificationInput = {
  typeCode: string;
  sourceModule: string;
  sourceId?: string | null;
  title: string;
  body: string;
  icon?: string | null;
  imageUrl?: string | null;
  deepLink?: string | null;
  priority?: NotificationPriority;
  senderUserId?: string | null;
  metadata?: Record<string, unknown>;
  recipientUserIds: string[];
  pushRequested?: boolean;
};

type PushSubscriptionRow = {
  recipient_user_id: string;
  subscription_id: string;
  endpoint: string;
  p256dh: string;
  auth_secret: string;
};

export async function createNotification(input: CreateNotificationInput) {
  const supabaseAdmin = getSupabaseAdmin();
  const recipients = [...new Set(input.recipientUserIds.filter(Boolean))];

  if (recipients.length === 0) {
    return { notificationId: null, recipientCount: 0 };
  }

  let notificationId: string | null = null;

  if (input.sourceId) {
    const { data: existing } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("source_module", input.sourceModule)
      .eq("source_id", input.sourceId)
      .eq("type_code", input.typeCode)
      .maybeSingle();

    notificationId = existing?.id ?? null;
  }

  if (!notificationId) {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert({
        type_code: input.typeCode,
        source_module: input.sourceModule,
        source_id: input.sourceId ?? null,
        title: input.title.trim(),
        body: input.body.trim(),
        icon: input.icon ?? null,
        image_url: input.imageUrl ?? null,
        deep_link: input.deepLink ?? null,
        priority: input.priority ?? "normal",
        sender_user_id: input.senderUserId ?? null,
        metadata: input.metadata ?? {},
      })
      .select("id")
      .single();

    if (error) throw error;
    notificationId = data.id;
  }

  const { error } = await supabaseAdmin
    .from("notification_recipients")
    .upsert(
      recipients.map((userId) => ({
        notification_id: notificationId,
        user_id: userId,
        push_requested: input.pushRequested ?? true,
      })),
      {
        onConflict: "notification_id,user_id",
        ignoreDuplicates: true,
      },
    );

  if (error) throw error;

  return {
    notificationId,
    recipientCount: recipients.length,
  };
}

export async function deliverNotificationPush(notificationId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("De VAPID-omgevingsvariabelen zijn niet volledig ingesteld.");
  }

  const { data: notification, error: notificationError } =
    await supabaseAdmin
      .from("notifications")
      .select("id,type_code,title,body,icon,image_url,deep_link,priority,metadata")
      .eq("id", notificationId)
      .single();

  if (notificationError || !notification) {
    throw new Error("Notificatie niet gevonden.");
  }

  const { data: subscriptions, error: subscriptionError } =
    await supabaseAdmin.rpc("get_notification_push_subscriptions", {
      target_notification_id: notificationId,
    });

  if (subscriptionError) throw subscriptionError;

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    icon: notification.icon || "/icon-192.png",
    badge: "/badge-96.png",
    image: notification.image_url ?? undefined,
    tag: `notification-${notification.type_code}-${notification.id}`,
    renotify: ["high", "urgent"].includes(notification.priority),
    data: {
      url: notification.deep_link || "/meldingen",
      notificationId: notification.id,
      typeCode: notification.type_code,
      ...notification.metadata,
    },
  });

  const results = await Promise.allSettled(
    ((subscriptions ?? []) as PushSubscriptionRow[]).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth_secret,
            },
          },
          payload,
          {
            TTL: notification.priority === "urgent" ? 3600 : 21600,
            urgency: ["high", "urgent"].includes(notification.priority)
              ? "high"
              : "normal",
          },
        );

        await Promise.all([
          supabaseAdmin
            .from("community_push_subscriptions")
            .update({
              last_success_at: new Date().toISOString(),
              failure_count: 0,
              last_failure_at: null,
            })
            .eq("id", subscription.subscription_id),
          supabaseAdmin
            .from("notification_recipients")
            .update({
              push_sent_at: new Date().toISOString(),
              push_failed_at: null,
              push_error: null,
            })
            .eq("notification_id", notificationId)
            .eq("user_id", subscription.recipient_user_id),
        ]);

        return true;
      } catch (error) {
        const statusCode =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error
            ? Number(error.statusCode)
            : null;

        await supabaseAdmin
          .from("notification_recipients")
          .update({
            push_failed_at: new Date().toISOString(),
            push_error:
              error instanceof Error
                ? error.message.slice(0, 1000)
                : "Onbekende pushfout",
          })
          .eq("notification_id", notificationId)
          .eq("user_id", subscription.recipient_user_id);

        if (statusCode === 404 || statusCode === 410) {
          await supabaseAdmin
            .from("community_push_subscriptions")
            .update({
              is_active: false,
              last_failure_at: new Date().toISOString(),
              failure_count: 99,
            })
            .eq("id", subscription.subscription_id);
        }

        throw error;
      }
    }),
  );

  const sent = results.filter((result) => result.status === "fulfilled").length;
  return { sent, failed: results.length - sent };
}
