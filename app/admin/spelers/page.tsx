"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import PlayerForm, {
  PlayerFormValues,
} from "../../../components/players/PlayerForm";
import PlayerList from "../../../components/players/PlayerList";
import DeletePlayerModal from "../../../components/players/DeletePlayerModal";
import type { PlayerCardPlayer } from "../../../components/players/PlayerCard";

import { supabase } from "../../../src/lib/supabase";
import {
  deletePlayerPhoto,
  getPlayerPhotoPath,
  uploadPlayerPhoto,
} from "../../../src/lib/playerStorage";

const EMPTY_FORM: PlayerFormValues = {
  name: "",
  shirtNumber: "",
  position: "Keeper",
  active: true,
};

export default function SpelersbeheerPage() {
  const [players, setPlayers] = useState<PlayerCardPlayer[]>([]);
  const [form, setForm] =
    useState<PlayerFormValues>(EMPTY_FORM);

  const [editingPlayerId, setEditingPlayerId] = useState<
    number | null
  >(null);

  const [existingPhotoUrl, setExistingPhotoUrl] = useState<
    string | null
  >(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  const [changingStatusId, setChangingStatusId] = useState<
    number | null
  >(null);

  const [playerToDelete, setPlayerToDelete] = useState<
    PlayerCardPlayer | null
  >(null);

  const [deletingPlayerId, setDeletingPlayerId] = useState<
    number | null
  >(null);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setErrorMessage("");

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      window.location.href =
        "/login?reason=login-required";
      return;
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userData.user.id)
        .single();

    if (profileError || !profile?.is_admin) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);
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
    setExistingPhotoUrl(null);
    setPhotoFile(null);
    setForm(EMPTY_FORM);

    setMessage("");
    setErrorMessage("");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openEditForm(player: PlayerCardPlayer) {
    setEditingPlayerId(player.id);
    setExistingPhotoUrl(player.photo_url);
    setPhotoFile(null);

    setForm({
      name: player.name,
      shirtNumber: player.shirt_number?.toString() ?? "",
      position: player.position ?? "Keeper",
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
    if (saving) {
      return;
    }

    resetForm();
    setMessage("");
    setErrorMessage("");
  }

  function resetForm() {
    setShowForm(false);
    setEditingPlayerId(null);
    setExistingPhotoUrl(null);
    setPhotoFile(null);
    setForm(EMPTY_FORM);
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

  async function submitPlayer(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setErrorMessage("");

    let uploadedPhotoPath: string | null = null;

    try {
      const trimmedName = form.name.trim();

      if (!trimmedName) {
        throw new Error("Vul de naam van de speler in.");
      }

      const shirtNumber = parseShirtNumber();

      let photoUrlToSave = existingPhotoUrl;

      if (photoFile) {
        const uploadedPhoto = await uploadPlayerPhoto({
          file: photoFile,
          playerName: trimmedName,
        });

        photoUrlToSave = uploadedPhoto.publicUrl;
        uploadedPhotoPath = uploadedPhoto.filePath;
      }

      if (editingPlayerId === null) {
        const { error } = await supabase.rpc(
          "admin_create_player",
          {
            p_name: trimmedName,
            p_shirt_number: shirtNumber,
            p_position: form.position,
            p_photo_url: photoUrlToSave,
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
            p_photo_url: photoUrlToSave,
            p_active: form.active,
          }
        );

        if (error) {
          throw error;
        }

        /*
         * Verwijder de vorige foto pas nadat de database
         * succesvol naar de nieuwe foto verwijst.
         */
        if (photoFile && existingPhotoUrl) {
          const oldPhotoPath =
            getPlayerPhotoPath(existingPhotoUrl);

          if (
            oldPhotoPath &&
            oldPhotoPath !== uploadedPhotoPath
          ) {
            try {
              await deletePlayerPhoto(oldPhotoPath);
            } catch (cleanupError) {
              console.error(
                "De oude spelersfoto kon niet worden verwijderd:",
                cleanupError
              );
            }
          }
        }

        setMessage("✅ De speler werd bijgewerkt.");
      }

      await loadPlayers();
      resetForm();
    } catch (error: unknown) {
      console.error("Fout bij opslaan speler:", error);

      /*
       * Wanneer de upload lukte maar de databasebewerking
       * mislukte, verwijderen we de nieuwe losse foto.
       */
      if (uploadedPhotoPath) {
        try {
          await deletePlayerPhoto(uploadedPhotoPath);
        } catch (cleanupError) {
          console.error(
            "De mislukte upload kon niet worden opgeruimd:",
            cleanupError
          );
        }
      }

      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "De speler kon niet worden opgeslagen."
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePlayerStatus(
    player: PlayerCardPlayer
  ) {
    setChangingStatusId(player.id);
    setMessage("");
    setErrorMessage("");

    try {
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
        throw error;
      }

      setMessage(
        player.active
          ? `✅ ${player.name} werd inactief gezet.`
          : `✅ ${player.name} werd opnieuw actief gezet.`
      );

      await loadPlayers();
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "De status van de speler kon niet worden aangepast."
        );
      }
    } finally {
      setChangingStatusId(null);
    }
  }

  async function deletePlayer() {
    if (!playerToDelete || deletingPlayerId !== null) {
      return;
    }

    const player = playerToDelete;

    setDeletingPlayerId(player.id);
    setMessage("");
    setErrorMessage("");

    try {
      const { error } = await supabase.rpc(
        "admin_delete_player",
        {
          p_player_id: player.id,
        }
      );

      if (error) {
        throw error;
      }

      /*
       * Verwijder de foto pas nadat de speler succesvol uit
       * de database is verwijderd. Zo blijft de database niet
       * achter met een kapotte foto-URL wanneer de RPC faalt.
       */
      let photoCleanupFailed = false;

      if (player.photo_url) {
        const photoPath = getPlayerPhotoPath(player.photo_url);

        if (photoPath) {
          try {
            await deletePlayerPhoto(photoPath);
          } catch (cleanupError) {
            photoCleanupFailed = true;
            console.error(
              "De spelersfoto kon niet worden verwijderd:",
              cleanupError
            );
          }
        }
      }

      setPlayers((currentPlayers) =>
        currentPlayers.filter(
          (currentPlayer) => currentPlayer.id !== player.id
        )
      );

      if (editingPlayerId === player.id) {
        resetForm();
      }

      setPlayerToDelete(null);
      setMessage(
        photoCleanupFailed
          ? `⚠️ ${player.name} werd verwijderd, maar de foto kon niet uit Storage worden opgeruimd.`
          : `✅ ${player.name} werd volledig verwijderd.`
      );
    } catch (error: unknown) {
      console.error("Fout bij verwijderen speler:", error);

      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          "De speler kon niet worden verwijderd."
        );
      }
    } finally {
      setDeletingPlayerId(null);
    }
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

  if (!isAdmin) {
    return (
      <main className="ucl-page">
        <div className="ucl-container">
          <div className="ucl-card">
            <h1 className="ucl-title">Geen toegang</h1>

            <p className="ucl-subtitle">
              Je hebt geen adminrechten voor deze pagina.
            </p>

            <Link
              href="/"
              className="ucl-button-secondary mt-6"
            >
              Terug naar dashboard
            </Link>
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
            Beheer de volledige spelerskern voor de verkiezing
            van Man van de Wedstrijd.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="ucl-button-secondary"
            >
              ← Terug naar admin
            </Link>

            <button
              type="button"
              onClick={openCreateForm}
              disabled={saving}
              className="ucl-button-primary disabled:cursor-not-allowed disabled:opacity-50"
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
            <p className="font-bold text-emerald-200">
              {message}
            </p>
          </div>
        )}

        {showForm && (
          <PlayerForm
            values={form}
            photoFile={photoFile}
            existingPhotoUrl={existingPhotoUrl}
            editing={editingPlayerId !== null}
            saving={saving}
            onChange={setForm}
            onPhotoChange={setPhotoFile}
            onSubmit={submitPlayer}
            onCancel={closeForm}
          />
        )}

        <section className="ucl-card">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">
                Volledige kern
              </h2>

              <p className="ucl-muted mt-1">
                {
                  players.filter(
                    (player) => player.active
                  ).length
                }{" "}
                actief van {players.length} spelers
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
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Naam, positie of nummer"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300"
              />
            </div>
          </div>

          <PlayerList
            players={filteredPlayers}
            totalPlayers={players.length}
            changingStatusId={changingStatusId}
            deletingPlayerId={deletingPlayerId}
            onEdit={openEditForm}
            onToggleStatus={togglePlayerStatus}
            onDelete={setPlayerToDelete}
          />
        </section>
      </div>

      <DeletePlayerModal
        player={playerToDelete}
        loading={deletingPlayerId !== null}
        onCancel={() => {
          if (deletingPlayerId === null) {
            setPlayerToDelete(null);
          }
        }}
        onConfirm={deletePlayer}
      />
    </main>
  );
}