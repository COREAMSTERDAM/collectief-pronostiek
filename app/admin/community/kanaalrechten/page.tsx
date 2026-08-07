"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getCommunityRoles, type CommunityRole } from "@/src/lib/community";
import {
  getChannelPermissions,
  getCommunityAdminStructure,
  saveChannelPermission,
  setChannelInheritance,
  type AdminCommunityChannel,
  type CommunityChannelPermission,
} from "@/src/lib/community-admin";

type PermissionKey =
  | "can_view"
  | "can_post"
  | "can_upload"
  | "can_moderate"
  | "can_manage";

const labels: Array<{ key: PermissionKey; label: string }> = [
  { key: "can_view", label: "Lezen" },
  { key: "can_post", label: "Schrijven" },
  { key: "can_upload", label: "Uploaden" },
  { key: "can_moderate", label: "Modereren" },
  { key: "can_manage", label: "Beheren" },
];

export default function ChannelPermissionsPage() {
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [channels, setChannels] =
    useState<AdminCommunityChannel[]>([]);
  const [permissions, setPermissions] =
    useState<CommunityChannelPermission[]>([]);
  const [selectedChannelId, setSelectedChannelId] =
    useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    Promise.all([
      getCommunityRoles(),
      getCommunityAdminStructure(),
      getChannelPermissions(),
    ])
      .then(([rolesResult, categories, permissionResult]) => {
        const channelResult = categories.flatMap(
          (category) => category.community_channels,
        );

        setRoles(rolesResult);
        setChannels(channelResult);
        setPermissions(permissionResult);
        setSelectedChannelId(channelResult[0]?.id ?? null);
      })
      .catch((error) =>
        setErrorMessage(
          error instanceof Error ? error.message : "Laden mislukt.",
        ),
      );
  }, []);

  const selected = channels.find(
    (channel) => channel.id === selectedChannelId,
  );

  const permissionMap = useMemo(() => {
    const map = new Map<string, CommunityChannelPermission>();
    for (const permission of permissions) {
      map.set(
        `${permission.channel_id}:${permission.role_id}`,
        permission,
      );
    }
    return map;
  }, [permissions]);

  async function cycle(
    roleId: number,
    key: PermissionKey,
  ) {
    if (!selected) return;

    const mapKey = `${selected.id}:${roleId}`;
    const current = permissionMap.get(mapKey) ?? {
      channel_id: selected.id,
      role_id: roleId,
      can_view: null,
      can_post: null,
      can_upload: null,
      can_moderate: null,
      can_manage: null,
    };

    const value = current[key];
    const nextValue =
      value === null ? true : value === true ? false : null;

    const updated = {
      ...current,
      [key]: nextValue,
    };

    setPermissions((items) => [
      ...items.filter(
        (item) =>
          !(
            item.channel_id === selected.id &&
            item.role_id === roleId
          ),
      ),
      updated,
    ]);

    try {
      await saveChannelPermission(updated);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Opslaan mislukt.",
      );
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-[92rem]">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
            Community Admin
          </p>
          <h1 className="ucl-title mt-3">
            Kanaalrechten
          </h1>
          <p className="ucl-subtitle">
            Een kanaal kan de rechten van zijn categorie overnemen of eigen
            uitzonderingen gebruiken.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_1fr]">
          <aside className="ucl-card">
            <h2 className="font-black">Kanalen</h2>

            <div className="mt-4 space-y-2">
              {channels
                .filter((channel) => !channel.is_archived)
                .map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`w-full rounded-2xl border p-3 text-left text-sm font-black ${
                      channel.id === selectedChannelId
                        ? "border-emerald-300/30 bg-emerald-400/10 text-white"
                        : "border-white/10 bg-black/20 text-white/45"
                    }`}
                  >
                    {channel.icon} {channel.name}
                  </button>
                ))}
            </div>
          </aside>

          <section className="ucl-card overflow-x-auto">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">
                      {selected.icon} {selected.name}
                    </h2>
                    <p className="mt-1 text-xs text-white/35">
                      Klik: overnemen → toestaan → weigeren → overnemen
                    </p>
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <input
                      type="checkbox"
                      checked={selected.inherit_category_permissions}
                      onChange={async (event) => {
                        const inherit = event.target.checked;
                        setChannels((items) =>
                          items.map((channel) =>
                            channel.id === selected.id
                              ? {
                                  ...channel,
                                  inherit_category_permissions: inherit,
                                }
                              : channel,
                          ),
                        );
                        await setChannelInheritance(
                          selected.id,
                          inherit,
                        );
                      }}
                    />
                    <span className="text-sm font-black">
                      Rechten categorie overnemen
                    </span>
                  </label>
                </div>

                <table className="mt-6 min-w-[850px] w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="p-3 text-left text-xs uppercase text-white/35">
                        Rol
                      </th>
                      {labels.map(({ key, label }) => (
                        <th
                          key={key}
                          className="p-3 text-center text-xs uppercase text-white/35"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {roles.map((role) => {
                      const permission = permissionMap.get(
                        `${selected.id}:${role.id}`,
                      );

                      return (
                        <tr
                          key={role.id}
                          className="border-b border-white/[0.06]"
                        >
                          <td className="p-3 font-black">
                            {role.icon} {role.name}
                          </td>

                          {labels.map(({ key }) => {
                            const value = permission?.[key] ?? null;

                            return (
                              <td key={key} className="p-3 text-center">
                                <button
                                  type="button"
                                  disabled={
                                    selected.inherit_category_permissions
                                  }
                                  onClick={() => void cycle(role.id, key)}
                                  className={`h-10 min-w-24 rounded-xl border px-2 text-xs font-black disabled:opacity-30 ${
                                    value === true
                                      ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-100"
                                      : value === false
                                        ? "border-red-300/25 bg-red-400/10 text-red-100"
                                        : "border-white/10 bg-white/5 text-white/40"
                                  }`}
                                >
                                  {value === true
                                    ? "Toestaan"
                                    : value === false
                                      ? "Weigeren"
                                      : "Overnemen"}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="ucl-muted">Kies een kanaal.</p>
            )}
          </section>
        </div>

        <div className="mt-8">
          <Link href="/admin/community" className="ucl-button-secondary">
            ← Terug naar Community Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
