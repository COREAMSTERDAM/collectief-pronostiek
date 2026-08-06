import { supabase } from "@/src/lib/supabase";

export type NotificationPreference = {
  type_code: string;
  name: string;
  description: string | null;
  icon: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
};

export async function getNotificationPreferences() {
  const { data, error } = await supabase.rpc(
    "get_my_notification_preferences",
  );

  if (error) {
    throw new Error(
      `Meldingsvoorkeuren ophalen mislukt: ${error.message}`,
    );
  }

  return (data ?? []) as NotificationPreference[];
}

export async function setNotificationPreference({
  typeCode,
  inAppEnabled,
  pushEnabled,
}: {
  typeCode: string;
  inAppEnabled: boolean;
  pushEnabled: boolean;
}) {
  const { error } = await supabase.rpc(
    "set_my_notification_preference",
    {
      target_type_code: typeCode,
      target_in_app_enabled: inAppEnabled,
      target_push_enabled: pushEnabled,
    },
  );

  if (error) {
    throw new Error(
      `Meldingsvoorkeur opslaan mislukt: ${error.message}`,
    );
  }
}
