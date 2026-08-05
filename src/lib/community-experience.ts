import { supabase } from "@/src/lib/supabase";

export type CommunityReaction = {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
};

export type CommunityUnreadCounts = Record<string, number>;

export async function toggleCommunityReaction(
  messageId: string,
  emoji: string,
) {
  const { data, error } = await supabase.rpc(
    "toggle_community_message_reaction",
    {
      target_message_id: messageId,
      target_emoji: emoji,
    },
  );

  if (error) {
    throw new Error(`Reactie opslaan mislukt: ${error.message}`);
  }

  return Boolean(data);
}

export async function markCommunityChannelRead(
  channelId: number,
) {
  const { error } = await supabase.rpc(
    "mark_community_channel_read",
    {
      target_channel_id: channelId,
    },
  );

  if (error) {
    throw new Error(
      `Kanaal als gelezen markeren mislukt: ${error.message}`,
    );
  }
}

export async function getCommunityUnreadCounts() {
  const { data, error } = await supabase.rpc(
    "get_my_community_unread_counts",
  );

  if (error) {
    throw new Error(
      `Ongelezen berichten ophalen mislukt: ${error.message}`,
    );
  }

  return (data ?? {}) as CommunityUnreadCounts;
}
