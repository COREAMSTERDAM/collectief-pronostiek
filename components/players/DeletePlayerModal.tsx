"use client";

import type { PlayerCardPlayer } from "./PlayerCard";

type DeletePlayerModalProps = {
  player: PlayerCardPlayer | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeletePlayerModal({
  player,
  loading,
  onCancel,
  onConfirm,
}: DeletePlayerModalProps) {
  if (!player) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-8 shadow-2xl">

        <div className="mb-5 text-center">
          <div className="mb-4 text-6xl">🗑️</div>

          <h2 className="text-2xl font-black text-white">
            Speler verwijderen
          </h2>

          <p className="mt-3 text-slate-300">
            Je staat op het punt om
          </p>

          <p className="mt-2 text-xl font-black text-white">
            {player.name}
          </p>

          <p className="mt-5 text-sm text-rose-300">
            Deze actie verwijdert ook alle stemmen van deze speler.
          </p>

          <p className="mt-2 text-sm text-slate-400">
            Dit kan niet ongedaan worden gemaakt.
          </p>
        </div>

        <div className="mt-8 flex gap-3">

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            Annuleren
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-600 py-3 font-black text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading
              ? "Verwijderen..."
              : "Definitief verwijderen"}
          </button>

        </div>

      </div>
    </div>
  );
}