import { supabase } from "@/src/lib/supabase";

export type AppNotification = {
  id: string;
  type_code: string;
  source_module: string;
  source_id: string | null;
  title: string;
  body: string;
  icon: string | null;
  image_url: string | null;
  deep_link: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  sender_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
};

export async function getMyNotifications() {
  const { data, error } = await supabase.rpc("get_my_notifications", {
    target_limit: 50,
    before_created_at: null,
  });

  if (error) {
    throw new Error(`Meldingen ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as AppNotification[];
}

export async function getNotificationUnreadCount() {
  const { data, error } = await supabase.rpc(
    "get_my_notification_unread_count",
  );

  if (error) {
    throw new Error(`Ongelezen meldingen ophalen mislukt: ${error.message}`);
  }

  return Number(data ?? 0);
}

export async function markNotificationRead(notificationId: string) {
  const { error } = await supabase.rpc("mark_notification_read", {
    target_notification_id: notificationId,
  });

  if (error) throw new Error(`Melding markeren mislukt: ${error.message}`);
}

export async function markAllNotificationsRead() {
  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) throw new Error(`Meldingen markeren mislukt: ${error.message}`);
}

export async function archiveNotification(notificationId: string) {
  const { error } = await supabase.rpc("archive_notification", {
    target_notification_id: notificationId,
  });

  if (error) throw new Error(`Melding verwijderen mislukt: ${error.message}`);
}
