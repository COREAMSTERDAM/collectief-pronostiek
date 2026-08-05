"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getAdminCommunityCategories,
  getCategoryPermissions,
  getCommunityRoles,
  saveCategoryPermission,
  type CommunityPermissionRow,
  type CommunityRole,
} from "@/src/lib/community";

type PermissionKey =
  | "can_view"
  | "can_post"
  | "can_upload"
  | "can_moderate"
  | "can_manage";

const permissionLabels: Array<{
  key: PermissionKey;
  label: string;
}> = [
  { key: "can_view", label: "Lezen" },
  { key: "can_post", label: "Schrijven" },
  { key: "can_upload", label: "Uploaden" },
  { key: "can_moderate", label: "Modereren" },
  { key: "can_manage", label: "Beheren" },
];

export default function CommunityPermissionsAdminPage() {
  const [roles, setRoles] = useState<CommunityRole[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [permissions, setPermissions] =
    useState<CommunityPermissionRow[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    Promise.all([
      getCommunityRoles(),
      getAdminCommunityCategories(),
      getCategoryPermissions(),
    ])
      .then(([rolesResult, categoriesResult, permissionsResult]) => {
        setRoles(rolesResult);
        setCategories(categoriesResult);
        setPermissions(permissionsResult);
      })
      .catch((error) =>
        setErrorMessage(
          error instanceof Error ? error.message : "Laden mislukt.",
        ),
      );
  }, []);

  const map = useMemo(() => {
    const result = new Map<string, CommunityPermissionRow>();

    for (const permission of permissions) {
      result.set(
        `${permission.category_id}:${permission.role_id}`,
        permission,
      );
    }

    return result;
  }, [permissions]);

  async function toggle(
    categoryId: number,
    roleId: number,
    key: PermissionKey,
  ) {
    const mapKey = `${categoryId}:${roleId}`;
    const current = map.get(mapKey) ?? {
      category_id: categoryId,
      role_id: roleId,
      can_view: false,
      can_post: false,
      can_upload: false,
      can_moderate: false,
      can_manage: false,
    };

    const updated = {
      ...current,
      [key]: !current[key],
    };

    setPermissions((items) => [
      ...items.filter(
        (item) =>
          !(
            item.category_id === categoryId &&
            item.role_id === roleId
          ),
      ),
      updated,
    ]);

    try {
      await saveCategoryPermission(updated);
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
          <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-200/70">
            Community Admin
          </p>
          <h1 className="ucl-title mt-3">Rollenmatrix</h1>
          <p className="ucl-subtitle">
            Klik op een recht om het onmiddellijk in Supabase aan of uit te
            zetten.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          {categories.map((category) => (
            <section key={category.id} className="ucl-card overflow-x-auto">
              <div className="mb-5 flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <h2 className="text-xl font-black text-white">
                  {category.name}
                </h2>
              </div>

              <table className="min-w-[900px] w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-3 text-left text-xs uppercase text-white/35">
                      Rol
                    </th>
                    {permissionLabels.map((permission) => (
                      <th
                        key={permission.key}
                        className="p-3 text-center text-xs uppercase text-white/35"
                      >
                        {permission.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {roles.map((role) => {
                    const permission = map.get(
                      `${category.id}:${role.id}`,
                    );

                    return (
                      <tr
                        key={role.id}
                        className="border-b border-white/[0.06] last:border-0"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <span>{role.icon}</span>
                            <span className="font-black text-white">
                              {role.name}
                            </span>
                          </div>
                        </td>

                        {permissionLabels.map(({ key }) => {
                          const enabled = permission?.[key] ?? false;

                          return (
                            <td key={key} className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  void toggle(
                                    category.id,
                                    role.id,
                                    key,
                                  )
                                }
                                className={`h-10 w-10 rounded-xl border text-lg font-black transition ${
                                  enabled
                                    ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-200"
                                    : "border-white/10 bg-white/5 text-white/25"
                                }`}
                              >
                                {enabled ? "✓" : "×"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
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
