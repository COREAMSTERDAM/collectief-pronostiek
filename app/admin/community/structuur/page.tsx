"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  archiveCommunityCategory,
  archiveCommunityChannel,
  getCommunityAdminStructure,
  reorderCategories,
  reorderChannels,
  saveCommunityCategory,
  saveCommunityChannel,
  type AdminCommunityCategory,
  type AdminCommunityChannel,
} from "@/src/lib/community-admin";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const emptyCategory = {
  id: undefined as number | undefined,
  name: "",
  slug: "",
  description: "",
  icon: "💬",
  is_active: true,
};

const emptyChannel = {
  id: undefined as number | undefined,
  category_id: 0,
  name: "",
  slug: "",
  description: "",
  icon: "#",
  is_read_only: false,
  inherit_category_permissions: true,
};

export default function CommunityStructureAdminPage() {
  const [categories, setCategories] =
    useState<AdminCommunityCategory[]>([]);
  const [categoryForm, setCategoryForm] =
    useState(emptyCategory);
  const [channelForm, setChannelForm] =
    useState(emptyChannel);
  const [draggedCategoryId, setDraggedCategoryId] =
    useState<number | null>(null);
  const [draggedChannel, setDraggedChannel] = useState<{
    id: number;
    categoryId: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function load() {
    try {
      setLoading(true);
      setCategories(await getCommunityAdminStructure());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Laden mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitCategory(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      await saveCommunityCategory(categoryForm);
      setCategoryForm(emptyCategory);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Opslaan mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitChannel(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      await saveCommunityChannel(channelForm);
      setChannelForm(emptyChannel);
      await load();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Opslaan mislukt.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveCategory(targetId: number) {
    if (!draggedCategoryId || draggedCategoryId === targetId) return;

    const copy = [...categories];
    const from = copy.findIndex(
      (category) => category.id === draggedCategoryId,
    );
    const to = copy.findIndex(
      (category) => category.id === targetId,
    );

    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    setCategories(copy);
    setDraggedCategoryId(null);

    try {
      await reorderCategories(copy.map((category) => category.id));
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Volgorde opslaan mislukt.",
      );
      await load();
    }
  }

  async function moveChannel(
    targetCategoryId: number,
    targetChannelId?: number,
  ) {
    if (!draggedChannel) return;

    const sourceCategory = categories.find(
      (category) => category.id === draggedChannel.categoryId,
    );
    const targetCategory = categories.find(
      (category) => category.id === targetCategoryId,
    );
    const moving = sourceCategory?.community_channels.find(
      (channel) => channel.id === draggedChannel.id,
    );

    if (!sourceCategory || !targetCategory || !moving) return;

    const next = categories.map((category) => ({
      ...category,
      community_channels: category.community_channels.filter(
        (channel) => channel.id !== moving.id,
      ),
    }));

    const destination = next.find(
      (category) => category.id === targetCategoryId,
    )!;

    const targetIndex = targetChannelId
      ? destination.community_channels.findIndex(
          (channel) => channel.id === targetChannelId,
        )
      : destination.community_channels.length;

    destination.community_channels.splice(
      targetIndex < 0
        ? destination.community_channels.length
        : targetIndex,
      0,
      { ...moving, category_id: targetCategoryId },
    );

    setCategories(next);
    setDraggedChannel(null);

    try {
      await reorderChannels(
        targetCategoryId,
        destination.community_channels.map((channel) => channel.id),
      );

      if (sourceCategory.id !== targetCategoryId) {
        const updatedSource = next.find(
          (category) => category.id === sourceCategory.id,
        )!;

        await reorderChannels(
          sourceCategory.id,
          updatedSource.community_channels.map((channel) => channel.id),
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Volgorde opslaan mislukt.",
      );
      await load();
    }
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container !max-w-7xl">
        <header className="ucl-card">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-200/70">
            Community Admin
          </p>
          <h1 className="ucl-title mt-3">
            Categorieën en kanalen
          </h1>
          <p className="ucl-subtitle">
            Voeg onderdelen toe, wijzig ze en sleep categorieën of kanalen
            naar hun gewenste plaats.
          </p>
        </header>

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-red-100">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitCategory} className="ucl-card">
            <h2 className="text-xl font-black">
              {categoryForm.id ? "Categorie bewerken" : "Categorie toevoegen"}
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-[5rem_1fr]">
              <input
                className="ucl-input"
                value={categoryForm.icon}
                onChange={(event) =>
                  setCategoryForm({
                    ...categoryForm,
                    icon: event.target.value,
                  })
                }
                aria-label="Icoon"
              />

              <input
                className="ucl-input"
                value={categoryForm.name}
                placeholder="Naam"
                required
                onChange={(event) =>
                  setCategoryForm({
                    ...categoryForm,
                    name: event.target.value,
                    slug: categoryForm.id
                      ? categoryForm.slug
                      : slugify(event.target.value),
                  })
                }
              />
            </div>

            <input
              className="ucl-input mt-3"
              value={categoryForm.slug}
              placeholder="slug"
              disabled={Boolean(categoryForm.id)}
              required
              onChange={(event) =>
                setCategoryForm({
                  ...categoryForm,
                  slug: slugify(event.target.value),
                })
              }
            />

            <textarea
              className="ucl-input mt-3 resize-y"
              rows={3}
              value={categoryForm.description}
              placeholder="Beschrijving"
              onChange={(event) =>
                setCategoryForm({
                  ...categoryForm,
                  description: event.target.value,
                })
              }
            />

            <button
              className="ucl-button-primary"
              disabled={saving}
            >
              Categorie opslaan
            </button>

            {categoryForm.id ? (
              <button
                type="button"
                className="ucl-button-secondary mt-3"
                onClick={() => setCategoryForm(emptyCategory)}
              >
                Annuleren
              </button>
            ) : null}
          </form>

          <form onSubmit={submitChannel} className="ucl-card">
            <h2 className="text-xl font-black">
              {channelForm.id ? "Kanaal bewerken" : "Kanaal toevoegen"}
            </h2>

            <select
              className="ucl-input mt-4"
              value={channelForm.category_id}
              required
              onChange={(event) =>
                setChannelForm({
                  ...channelForm,
                  category_id: Number(event.target.value),
                })
              }
            >
              <option value={0}>Kies een categorie</option>
              {categories
                .filter((category) => category.is_active)
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>

            <div className="mt-3 grid gap-3 sm:grid-cols-[5rem_1fr]">
              <input
                className="ucl-input"
                value={channelForm.icon}
                onChange={(event) =>
                  setChannelForm({
                    ...channelForm,
                    icon: event.target.value,
                  })
                }
                aria-label="Icoon"
              />

              <input
                className="ucl-input"
                value={channelForm.name}
                placeholder="Naam"
                required
                onChange={(event) =>
                  setChannelForm({
                    ...channelForm,
                    name: event.target.value,
                    slug: channelForm.id
                      ? channelForm.slug
                      : slugify(event.target.value),
                  })
                }
              />
            </div>

            <input
              className="ucl-input mt-3"
              value={channelForm.slug}
              placeholder="slug"
              disabled={Boolean(channelForm.id)}
              required
              onChange={(event) =>
                setChannelForm({
                  ...channelForm,
                  slug: slugify(event.target.value),
                })
              }
            />

            <textarea
              className="ucl-input mt-3 resize-y"
              rows={3}
              value={channelForm.description}
              placeholder="Beschrijving"
              onChange={(event) =>
                setChannelForm({
                  ...channelForm,
                  description: event.target.value,
                })
              }
            />

            <label className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
              <input
                type="checkbox"
                checked={channelForm.is_read_only}
                onChange={(event) =>
                  setChannelForm({
                    ...channelForm,
                    is_read_only: event.target.checked,
                  })
                }
              />
              <span className="text-sm font-black">
                Alleen-lezenkanaal
              </span>
            </label>

            <button
              className="ucl-button-primary"
              disabled={saving || channelForm.category_id === 0}
            >
              Kanaal opslaan
            </button>

            {channelForm.id ? (
              <button
                type="button"
                className="ucl-button-secondary mt-3"
                onClick={() => setChannelForm(emptyChannel)}
              >
                Annuleren
              </button>
            ) : null}
          </form>
        </div>

        <section className="mt-6 space-y-5">
          {loading ? (
            <div className="ucl-card">Structuur laden…</div>
          ) : (
            categories.map((category) => (
              <article
                key={category.id}
                draggable
                onDragStart={() => setDraggedCategoryId(category.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void moveCategory(category.id)}
                className={`ucl-card ${
                  category.is_active ? "" : "opacity-45"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="cursor-grab text-white/30">☰</span>
                  <span className="text-2xl">{category.icon}</span>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black">
                      {category.name}
                    </h2>
                    <p className="text-xs text-white/35">
                      {category.slug}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
                    onClick={() =>
                      setCategoryForm({
                        id: category.id,
                        name: category.name,
                        slug: category.slug,
                        description: category.description ?? "",
                        icon: category.icon,
                        is_active: category.is_active,
                      })
                    }
                  >
                    Bewerken
                  </button>

                  {category.is_active ? (
                    <button
                      type="button"
                      className="text-xs font-black text-red-300"
                      onClick={async () => {
                        if (!confirm("Categorie archiveren?")) return;
                        await archiveCommunityCategory(category.id);
                        await load();
                      }}
                    >
                      Archiveren
                    </button>
                  ) : null}
                </div>

                <div
                  className="mt-5 space-y-2 rounded-2xl border border-dashed border-white/10 p-3"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void moveChannel(category.id)}
                >
                  {category.community_channels
                    .filter((channel) => !channel.is_archived)
                    .map((channel) => (
                      <div
                        key={channel.id}
                        draggable
                        onDragStart={(event) => {
                          event.stopPropagation();
                          setDraggedChannel({
                            id: channel.id,
                            categoryId: category.id,
                          });
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.stopPropagation();
                          void moveChannel(category.id, channel.id);
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <span className="cursor-grab text-white/25">☰</span>
                        <span>{channel.icon}</span>

                        <div className="min-w-0 flex-1">
                          <p className="font-black">
                            {channel.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-white/35">
                            {channel.description}
                          </p>
                        </div>

                        {channel.is_read_only ? (
                          <span className="text-[9px] font-black uppercase text-emerald-200">
                            alleen lezen
                          </span>
                        ) : null}

                        <button
                          type="button"
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black"
                          onClick={() =>
                            setChannelForm({
                              id: channel.id,
                              category_id: category.id,
                              name: channel.name,
                              slug: channel.slug,
                              description: channel.description ?? "",
                              icon: channel.icon,
                              is_read_only: channel.is_read_only,
                              inherit_category_permissions:
                                channel.inherit_category_permissions,
                            })
                          }
                        >
                          Bewerken
                        </button>

                        <button
                          type="button"
                          className="text-xs font-black text-red-300"
                          onClick={async () => {
                            if (!confirm("Kanaal archiveren?")) return;
                            await archiveCommunityChannel(channel.id);
                            await load();
                          }}
                        >
                          Archiveren
                        </button>
                      </div>
                    ))}

                  {category.community_channels.filter(
                    (channel) => !channel.is_archived,
                  ).length === 0 ? (
                    <p className="p-3 text-center text-xs text-white/30">
                      Sleep een kanaal hierheen of maak een nieuw kanaal.
                    </p>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>

        <div className="mt-8">
          <Link href="/admin/community" className="ucl-button-secondary">
            ← Terug naar Community Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
