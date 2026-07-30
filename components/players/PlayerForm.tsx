"use client";

import { FormEvent } from "react";
import PlayerPhotoUpload from "./PlayerPhotoUpload";

export type PlayerFormValues = {
  name: string;
  shirtNumber: string;
  position: string;
  active: boolean;
};

type PlayerFormProps = {
  values: PlayerFormValues;
  photoFile: File | null;
  existingPhotoUrl?: string | null;
  editing: boolean;
  saving: boolean;
  onChange: (values: PlayerFormValues) => void;
  onPhotoChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const POSITIONS = [
  "Keeper",
  "Verdediger",
  "Middenvelder",
  "Aanvaller",
] as const;

export default function PlayerForm({
  values,
  photoFile,
  existingPhotoUrl = null,
  editing,
  saving,
  onChange,
  onPhotoChange,
  onSubmit,
  onCancel,
}: PlayerFormProps) {
  return (
    <section className="ucl-card mb-7">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">
            {editing ? "Speler bewerken" : "Nieuwe speler"}
          </h2>

          <p className="ucl-muted mt-1">
            Actieve spelers verschijnen automatisch in iedere stemlijst.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="ucl-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Annuleren
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
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
            value={values.name}
            onChange={(event) =>
              onChange({
                ...values,
                name: event.target.value,
              })
            }
            placeholder="Bijvoorbeeld Kevin De Bruyne"
            required
            disabled={saving}
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
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
              step="1"
              value={values.shirtNumber}
              onChange={(event) =>
                onChange({
                  ...values,
                  shirtNumber: event.target.value,
                })
              }
              placeholder="10"
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
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
              value={values.position}
              onChange={(event) =>
                onChange({
                  ...values,
                  position: event.target.value,
                })
              }
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {POSITIONS.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </div>
        </div>

        <PlayerPhotoUpload
          value={photoFile}
          existingPhotoUrl={existingPhotoUrl}
          disabled={saving}
          onChange={onPhotoChange}
        />

        {editing && (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <input
              type="checkbox"
              checked={values.active}
              onChange={(event) =>
                onChange({
                  ...values,
                  active: event.target.checked,
                })
              }
              disabled={saving}
              className="h-5 w-5 disabled:cursor-not-allowed"
            />

            <span>
              <span className="block font-black text-white">
                Actieve speler
              </span>

              <span className="ucl-muted text-sm">
                Actieve spelers verschijnen in de keuzelijst bij iedere
                wedstrijd.
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
            : editing
              ? "Wijzigingen bewaren"
              : "Speler toevoegen"}
        </button>
      </form>
    </section>
  );
}