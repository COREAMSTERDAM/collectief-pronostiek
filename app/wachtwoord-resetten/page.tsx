"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function WachtwoordResettenPage() {
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");

  async function updatePassword() {
    if (!password || !passwordRepeat) {
      alert("Vul beide velden in.");
      return;
    }

    if (password !== passwordRepeat) {
      alert("De wachtwoorden komen niet overeen.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Je wachtwoord is aangepast. Je kunt nu inloggen.");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-4">Nieuw wachtwoord</h1>

        <input
          type="password"
          placeholder="Nieuw wachtwoord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 mb-4"
        />

        <input
          type="password"
          placeholder="Herhaal wachtwoord"
          value={passwordRepeat}
          onChange={(e) => setPasswordRepeat(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 mb-4"
        />

        <button
          onClick={updatePassword}
          className="w-full bg-white text-black font-bold p-3 rounded-lg"
        >
          Wachtwoord aanpassen
        </button>
      </div>
    </main>
  );
}