import { supabase } from "@/src/lib/supabase";

export type CommunityChannelDetail = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  is_read_only: boolean;
  category_id: number;
  category_name: string;
  category_icon: string;
  can_post: boolean;
  can_moderate: boolean;
};

export type CommunityReplyPreview = {
  id: string;
  user_name: string;
  content: string;
};

export type CommunityReaction = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export type CommunityMessage = {
  id: string;
  channel_id: number;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string;
  reply_to_message_id: string | null;
  reply_to: CommunityReplyPreview | null;
  is_pinned: boolean;
  is_edited: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  is_own: boolean;
  can_moderate: boolean;
  reactions: CommunityReaction[];
};

async function createCommunityNotification(messageId: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return;

  try {
    await fetch("/api/notifications/community-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messageId }),
      keepalive: true,
    });
  } catch {
    // Het chatbericht blijft opgeslagen wanneer push tijdelijk faalt.
  }
}

export async function getCommunityChannel(
  channelId: number,
): Promise<CommunityChannelDetail | null> {
  const { data, error } = await supabase.rpc("get_community_channel", {
    target_channel_id: channelId,
  });

  if (error) {
    throw new Error(`Kanaal ophalen mislukt: ${error.message}`);
  }

  return (data as CommunityChannelDetail | null) ?? null;
}

export async function getCommunityMessages(
  channelId: number,
  options?: { limit?: number; before?: string | null },
): Promise<CommunityMessage[]> {
  const { data, error } = await supabase.rpc("get_community_messages", {
    target_channel_id: channelId,
    target_limit: options?.limit ?? 60,
    before_created_at: options?.before ?? null,
  });

  if (error) {
    throw new Error(`Berichten ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as CommunityMessage[];
}

export async function createCommunityMessage({
  channelId,
  content,
  replyToMessageId,
}: {
  channelId: number;
  content: string;
  replyToMessageId?: string | null;
}) {
  const { data, error } = await supabase.rpc("create_community_message", {
    target_channel_id: channelId,
    target_content: content,
    target_reply_to_message_id: replyToMessageId ?? null,
  });

  if (error) {
    throw new Error(`Bericht versturen mislukt: ${error.message}`);
  }

  const messageId = data as string;
  await createCommunityNotification(messageId);
  return messageId;
}

export async function updateCommunityMessage(
  messageId: string,
  content: string,
) {
  const { error } = await supabase.rpc("update_community_message", {
    target_message_id: messageId,
    target_content: content,
  });

  if (error) {
    throw new Error(`Bericht bewerken mislukt: ${error.message}`);
  }
}

export async function deleteCommunityMessage(messageId: string) {
  const { error } = await supabase.rpc("delete_community_message", {
    target_message_id: messageId,
  });

  if (error) {
    throw new Error(`Bericht verwijderen mislukt: ${error.message}`);
  }
}

export async function toggleCommunityMessagePin(messageId: string) {
  const { data, error } = await supabase.rpc(
    "toggle_community_message_pin",
    { target_message_id: messageId },
  );

  if (error) {
    throw new Error(`Vastpinnen mislukt: ${error.message}`);
  }

  return Boolean(data);
}
