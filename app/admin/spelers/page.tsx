"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabase";

type Player = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  active: boolean;
};

type PlayerForm = {
  name: string;
  shirtNumber: string;
  position: string;
  photoUrl: string;
  active: boolean;
};

const EMPTY_FORM: PlayerForm = {
  name: "",
  shirtNumber: "",
  position: "Keeper",
  photoUrl: "",
  active: true,
};

const POSITIONS = [
  "Keeper",
  "Verdediger",
  "Middenvelder",
  "Aanvaller",
] as const;

export default function SpelersbeheerPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [form, setForm] = useState<PlayerForm>(EMPTY_FORM);

  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<
    number | null
  >(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      window.location.href = "/login?reason=login-required";
      return;
    }

    await loadPlayers();
    setLoading(false);
  }

  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select(
        `
          id,
          name,
          shirt_number,
          position,
          photo_url,
          active
        `
      )
      .order("active", { ascending: false })
      .order("shirt_number", {
        ascending: true,
        nullsFirst: false,
      })
      .order("name", { ascending: true });

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPlayers(
      (data ?? []).map((player) => ({
        id: Number(player.id),
        name: player.name,
        shirt_number:
          player.shirt_number === null
            ? null
            : Number(player.shirt_number),
        position: player.position,
        photo_url: player.photo_url,
        active: Boolean(player.active),
      }))
    );
  }

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return players;
    }

    return players.filter((player) => {
      const searchableText = [
        player.name,
        player.position ?? "",
        player.shirt_number?.toString() ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [players, search]);

  function openCreateForm() {
    setEditingPlayerId(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setErrorMessage("");
    setShowForm(true);
  }

  function openEditForm(player: Player) {
    setEditingPlayerId(player.id);

    setForm({
      name: player.name,
      shirtNumber: player.shirt_number?.toString() ?? "",
      position: player.position ?? "Keeper",
      photoUrl: player.photo_url ?? "",
      active: player.active,
    });

    setMessage("");
    setErrorMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeForm() {
    setShowForm(false);
    setEditingPlayerId(null);
    setForm(EMPTY_FORM);
    setMessage("");
    setErrorMessage("");
  }

  function parseShirtNumber(): number | null {
    const value = form.shirtNumber.trim();

    if (!value) {
      return null;
    }

    const parsedValue = Number(value);

    if (
      !Number.isInteger(parsedValue) ||
      parsedValue < 1 ||
      parsedValue > 99
    ) {
      throw new Error(
        "Het rugnummer moet een geheel getal tussen 1 en 99 zijn."
      );
    }

    return parsedValue;
  }

  async function submitPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      const trimmedName = form.name.trim();

      if (!trimmedName) {
        throw new Error("Vul de naam van de speler in.");
      }

      const shirtNumber = parseShirtNumber();

      if (editingPlayerId === null) {
        const { error } = await supabase.rpc(
          "admin_create_player",
          {
            p_name: trimmedName,
            p_shirt_number: shirtNumber,
            p_position: form.position,
            p_photo_url: form.photoUrl.trim() || null,
          }
        );

        if (error) {
          throw error;
        }

        setMessage("✅ De speler werd toegevoegd.");
      } else {
        const { error } = await supabase.rpc(
          "admin_update_player",
          {
            p_player_id: editingPlayerId,
            p_name: trimmedName,
            p_shirt_number: shirtNumber,
            p_position: form.position,
            p_photo_url: form.photoUrl.trim() || null,
            p_active: form.active,
          }
        );

        if (error) {
          throw error;
        }

        setMessage("✅ De speler werd bijgewerkt.");
      }

      await loadPlayers();

      setEditingPlayerId(null);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "De speler kon niet worden opgeslagen."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePlayerStatus(player: Player) {
    setChangingStatusId(player.id);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc(
      "admin_update_player",
      {
        p_player_id: player.id,
        p_name: player.name,
        p_shirt_number: player.shirt_number,
        p_position: player.position ?? "Keeper",
        p_photo_url: player.photo_url,
        p_active: !player.active,
      }
    );

    if (error) {
      setErrorMessage(error.message);
      setChangingStatusId(null);
      return;
    }

    setMessage(
      player.active
        ? `✅ ${player.name} werd inactief gezet.`
        : `✅ ${player.name} werd opnieuw actief gezet.`
    );

    await loadPlayers();
    setChangingStatusId(null);
  }

  if (loading) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <p className="ucl-muted">Spelers laden...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ucl-page">
      <div className="ucl-container">
        <header className="mb-7">
          <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-sky-300">
            Admin
          </p>

          <h1 className="ucl-title">⚽ Spelersbeheer</h1>

          <p className="ucl-subtitle">
            Beheer de volledige spelerskern voor de verkiezing van
            Man van de Wedstrijd.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin" className="ucl-button-secondary">
              ← Terug naar admin
            </Link>

            <button
              type="button"
              onClick={openCreateForm}
              className="ucl-button-primary"
            >
              + Nieuwe speler
            </button>
          </div>
        </header>

        {errorMessage && (
          <div className="mb-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4">
            <p className="font-bold text-rose-200">
              {errorMessage}
            </p>
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
            <p className="font-bold text-emerald-200">{message}</p>
          </div>
        )}

        {showForm && (
          <section className="ucl-card mb-7">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">
                  {editingPlayerId === null
                    ? "Nieuwe speler"
                    : "Speler bewerken"}
                </h2>

                <p className="ucl-muted mt-1">
                  Spelers die actief zijn verschijnen automatisch in
                  iedere stemlijst.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="ucl-button-secondary"
              >
                Annuleren
              </button>
            </div>

            <form onSubmit={submitPlayer} className="space-y-5">
              <div>
                <label
                  htmlFor="player-name"
                  className="mb-2 block font-bold text-white"
                >
                  Naam
                </label>

                <input
                  id="player-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Bijvoorbeeld Kevin De Bruyne"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="shirt-number"
                    className="mb-2 block font-bold text-white"
                  >
                    Rugnummer
                  </label>

                  <input
                    id="shirt-number"
                    type="number"
                    min="1"
                    max="99"
                    value={form.shirtNumber}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        shirtNumber: event.target.value,
                      }))
                    }
                    placeholder="10"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300"
                  />
                </div>

                <div>
                  <label
                    htmlFor="position"
                    className="mb-2 block font-bold text-white"
                  >
                    Positie
                  </label>

                  <select
                    id="position"
                    value={form.position}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        position: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300"
                  >
                    {POSITIONS.map((position) => (
                      <option key={position} value={position}>
                        {position}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="photo-url"
                  className="mb-2 block font-bold text-white"
                >
                  Foto-URL
                </label>

                <input
                  id="photo-url"
                  type="url"
                  value={form.photoUrl}
                  onChange={(event) =>
                    setForm((currentForm) => ({
                      ...currentForm,
                      photoUrl: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300"
                />

                <p className="ucl-muted mt-2 text-sm">
                  In de volgende stap vervangen we dit door een echte
                  foto-upload.
                </p>
              </div>

              {editingPlayerId !== null && (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      setForm((currentForm) => ({
                        ...currentForm,
                        active: event.target.checked,
                      }))
                    }
                    className="h-5 w-5"
                  />

                  <span>
                    <span className="block font-black text-white">
                      Actieve speler
                    </span>

                    <span className="ucl-muted text-sm">
                      Actieve spelers verschijnen in de keuzelijst bij
                      iedere wedstrijd.
                    </span>
                  </span>
                </label>
              )}

              <button
                type="submit"
                disabled={saving}
                className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Opslaan..."
                  : editingPlayerId === null
                    ? "Speler toevoegen"
                    : "Wijzigingen bewaren"}
              </button>
            </form>
          </section>
        )}

        <section className="ucl-card">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">
                Volledige kern
              </h2>

              <p className="ucl-muted mt-1">
                {players.filter((player) => player.active).length} actief
                van {players.length} spelers
              </p>
            </div>

            <div className="w-full sm:w-72">
              <label
                htmlFor="player-search"
                className="mb-2 block text-sm font-bold text-white"
              >
                Speler zoeken
              </label>

              <input
                id="player-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Naam, positie of nummer"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300"
              />
            </div>
          </div>

          {filteredPlayers.length === 0 ? (
            <div className="ucl-card-dark">
              <p className="ucl-muted">
                {players.length === 0
                  ? "Er zijn nog geen spelers toegevoegd."
                  : "Geen spelers gevonden voor deze zoekopdracht."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPlayers.map((player) => (
                <article
                  key={player.id}
                  className={`rounded-2xl border p-4 ${
                    player.active
                      ? "border-white/10 bg-white/5"
                      : "border-white/5 bg-black/20 opacity-65"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      {player.photo_url ? (
                        <img
                          src={player.photo_url}
                          alt={player.name}
                          className="h-16 w-16 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-black text-white">
                          {player.shirt_number ?? "⚽"}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-black text-white">
                            {player.name}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                              player.active
                                ? "bg-emerald-500/15 text-emerald-200"
                                : "bg-white/10 text-white/60"
                            }`}
                          >
                            {player.active ? "Actief" : "Inactief"}
                          </span>
                        </div>

                        <p className="ucl-muted mt-1">
                          {player.shirt_number !== null
                            ? `Nr. ${player.shirt_number}`
                            : "Geen rugnummer"}
                          {" · "}
                          {player.position ?? "Geen positie"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(player)}
                        className="ucl-button-secondary"
                      >
                        Bewerken
                      </button>

                      <button
                        type="button"
                        onClick={() => togglePlayerStatus(player)}
                        disabled={changingStatusId === player.id}
                        className="ucl-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {changingStatusId === player.id
                          ? "Bezig..."
                          : player.active
                            ? "Inactief zetten"
                            : "Actief zetten"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}