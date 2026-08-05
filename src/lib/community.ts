import { supabase } from "@/src/lib/supabase";

export type CommunityRole = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  priority: number;
  is_system: boolean;
  is_default: boolean;
  is_active: boolean;
};

export type CommunityChannel = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  is_read_only: boolean;
  sort_order: number;
};

export type CommunityCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  channels: CommunityChannel[];
};

export type CommunityPermissionRow = {
  category_id: number;
  role_id: number;
  can_view: boolean;
  can_post: boolean;
  can_upload: boolean;
  can_moderate: boolean;
  can_manage: boolean;
};

export async function getMyCommunityStructure() {
  const { data, error } = await supabase.rpc(
    "get_my_community_structure",
  );

  if (error) {
    throw new Error(
      `Community ophalen mislukt: ${error.message}`,
    );
  }

  return (data ?? []) as CommunityCategory[];
}

export async function getCommunityRoles() {
  const { data, error } = await supabase
    .from("community_roles")
    .select(
      "id, code, name, description, color, icon, priority, is_system, is_default, is_active",
    )
    .order("priority");

  if (error) {
    throw new Error(`Rollen ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as CommunityRole[];
}

export async function saveCommunityRole(
  role: Partial<CommunityRole> & {
    name: string;
    code: string;
  },
) {
  const payload = {
    code: role.code,
    name: role.name,
    description: role.description ?? null,
    color: role.color ?? "#f5f5f5",
    icon: role.icon ?? "👤",
    priority: role.priority ?? 0,
    is_default: role.is_default ?? false,
    is_active: role.is_active ?? true,
  };

  const query = role.id
    ? supabase
        .from("community_roles")
        .update(payload)
        .eq("id", role.id)
    : supabase.from("community_roles").insert(payload);

  const { error } = await query;

  if (error) {
    throw new Error(`Rol opslaan mislukt: ${error.message}`);
  }
}

export async function archiveCommunityRole(roleId: number) {
  const { error } = await supabase
    .from("community_roles")
    .update({ is_active: false })
    .eq("id", roleId)
    .eq("is_system", false);

  if (error) {
    throw new Error(`Rol archiveren mislukt: ${error.message}`);
  }
}

export async function getAdminCommunityCategories() {
  const { data, error } = await supabase
    .from("community_categories")
    .select(
      "id, name, slug, description, icon, sort_order, is_active, community_channels(id, name, slug, description, icon, sort_order, is_read_only, is_archived, inherit_category_permissions)",
    )
    .order("sort_order");

  if (error) {
    throw new Error(
      `Communitystructuur ophalen mislukt: ${error.message}`,
    );
  }

  return data ?? [];
}

export async function getCategoryPermissions() {
  const { data, error } = await supabase
    .from("community_category_permissions")
    .select(
      "category_id, role_id, can_view, can_post, can_upload, can_moderate, can_manage",
    );

  if (error) {
    throw new Error(
      `Rechten ophalen mislukt: ${error.message}`,
    );
  }

  return (data ?? []) as CommunityPermissionRow[];
}

export async function saveCategoryPermission(
  permission: CommunityPermissionRow,
) {
  const { error } = await supabase
    .from("community_category_permissions")
    .upsert(permission, {
      onConflict: "category_id,role_id",
    });

  if (error) {
    throw new Error(
      `Recht opslaan mislukt: ${error.message}`,
    );
  }
}
