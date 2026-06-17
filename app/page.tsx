"use client";

import { supabase } from "../src/lib/supabase";

export default function Home() {
  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <img src="/logo.png" alt="Logo" />
        <h1 className="text-3xl font-bold mb-2">
          Collectief Pronostiek
        </h1>

        <p className="text-slate-300 mb-8">
          Welkom in je pronostiek-dashboard.
        </p>

        <div className="space-y-4">
          <a href="/wedstrijden" className="block rounded-xl bg-white text-slate-950 p-4 font-semibold text-center">
            ⚽ Wedstrijden
          </a>

          <a href="/klassement" className="block rounded-xl border border-slate-700 p-4 font-semibold text-center">
            🏆 Klassement
          </a>

          <a href="/admin" className="block rounded-xl border border-slate-700 p-4 font-semibold text-center">
            ⚙️ Admin
          </a>

          <button
            onClick={logout}
            className="w-full rounded-xl bg-red-900 p-4 font-semibold text-center"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </main>
  );
}


