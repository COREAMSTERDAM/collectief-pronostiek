import { supabase } from "@/src/lib/supabase";
import type {
  CommunityPermissionRow,
  CommunityRole,
} from "@/src/lib/community";

export type AdminCommunityChannel = {
  id: number;
  category_id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_read_only: boolean;
  is_archived: boolean;
  inherit_category_permissions: boolean;
};

export type AdminCommunityCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  community_channels: AdminCommunityChannel[];
};

export type CommunityChannelPermission = {
  channel_id: number;
  role_id: number;
  can_view: boolean | null;
  can_post: boolean | null;
  can_upload: boolean | null;
  can_moderate: boolean | null;
  can_manage: boolean | null;
};

export async function getCommunityAdminStructure() {
  const { data, error } = await supabase
    .from("community_categories")
    .select(`
      id,
      name,
      slug,
      description,
      icon,
      sort_order,
      is_active,
      community_channels (
        id,
        category_id,
        name,
        slug,
        description,
        icon,
        sort_order,
        is_read_only,
        is_archived,
        inherit_category_permissions
      )
    `)
    .order("sort_order");

  if (error) {
    throw new Error(`Structuur ophalen mislukt: ${error.message}`);
  }

  return ((data ?? []) as AdminCommunityCategory[]).map(
    (category) => ({
      ...category,
      community_channels: [...(category.community_channels ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order),
    }),
  );
}

export async function saveCommunityCategory(
  category: Partial<AdminCommunityCategory> & {
    name: string;
    slug: string;
  },
) {
  const payload = {
    name: category.name.trim(),
    slug: category.slug.trim(),
    description: category.description?.trim() || null,
    icon: category.icon?.trim() || "💬",
    sort_order: category.sort_order ?? 0,
    is_active: category.is_active ?? true,
  };

  const query = category.id
    ? supabase
        .from("community_categories")
        .update(payload)
        .eq("id", category.id)
    : supabase.from("community_categories").insert(payload);

  const { error } = await query;

  if (error) {
    throw new Error(`Categorie opslaan mislukt: ${error.message}`);
  }
}

export async function saveCommunityChannel(
  channel: Partial<AdminCommunityChannel> & {
    category_id: number;
    name: string;
    slug: string;
  },
) {
  const payload = {
    category_id: channel.category_id,
    name: channel.name.trim(),
    slug: channel.slug.trim(),
    description: channel.description?.trim() || null,
    icon: channel.icon?.trim() || "#",
    sort_order: channel.sort_order ?? 0,
    is_read_only: channel.is_read_only ?? false,
    is_archived: channel.is_archived ?? false,
    inherit_category_permissions:
      channel.inherit_category_permissions ?? true,
  };

  const query = channel.id
    ? supabase
        .from("community_channels")
        .update(payload)
        .eq("id", channel.id)
    : supabase.from("community_channels").insert(payload);

  const { error } = await query;

  if (error) {
    throw new Error(`Kanaal opslaan mislukt: ${error.message}`);
  }
}

export async function archiveCommunityCategory(id: number) {
  const { error } = await supabase.rpc(
    "admin_archive_community_category",
    { target_category_id: id },
  );

  if (error) {
    throw new Error(`Categorie archiveren mislukt: ${error.message}`);
  }
}

export async function archiveCommunityChannel(id: number) {
  const { error } = await supabase.rpc(
    "admin_archive_community_channel",
    { target_channel_id: id },
  );

  if (error) {
    throw new Error(`Kanaal archiveren mislukt: ${error.message}`);
  }
}

export async function reorderCategories(ids: number[]) {
  const { error } = await supabase.rpc(
    "admin_reorder_community_categories",
    { ordered_ids: ids },
  );

  if (error) {
    throw new Error(`Volgorde opslaan mislukt: ${error.message}`);
  }
}

export async function reorderChannels(
  categoryId: number,
  ids: number[],
) {
  const { error } = await supabase.rpc(
    "admin_reorder_community_channels",
    {
      target_category_id: categoryId,
      ordered_ids: ids,
    },
  );

  if (error) {
    throw new Error(`Kanaalvolgorde opslaan mislukt: ${error.message}`);
  }
}

export async function getChannelPermissions() {
  const { data, error } = await supabase
    .from("community_channel_permissions")
    .select(
      "channel_id, role_id, can_view, can_post, can_upload, can_moderate, can_manage",
    );

  if (error) {
    throw new Error(`Kanaalrechten ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as CommunityChannelPermission[];
}

export async function saveChannelPermission(
  permission: CommunityChannelPermission,
) {
  const { error } = await supabase
    .from("community_channel_permissions")
    .upsert(permission, {
      onConflict: "channel_id,role_id",
    });

  if (error) {
    throw new Error(`Kanaalrecht opslaan mislukt: ${error.message}`);
  }
}

export async function setChannelInheritance(
  channelId: number,
  inherit: boolean,
) {
  const { error } = await supabase
    .from("community_channels")
    .update({ inherit_category_permissions: inherit })
    .eq("id", channelId);

  if (error) {
    throw new Error(`Overerving opslaan mislukt: ${error.message}`);
  }
}

export async function setUserCommunityRoles(
  userId: string,
  roleIds: number[],
) {
  const { error } = await supabase.rpc(
    "admin_set_community_user_roles",
    {
      target_user_id: userId,
      target_role_ids: roleIds,
    },
  );

  if (error) {
    throw new Error(`Gebruikersrollen opslaan mislukt: ${error.message}`);
  }
}
