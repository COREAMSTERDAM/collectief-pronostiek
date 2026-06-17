"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function WachtwoordVergetenPage() {
  const [email, setEmail] = useState("");

  async function sendResetEmail() {
    if (!email) {
      alert("Vul je e-mailadres in.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/wachtwoord-resetten`,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Controleer je mailbox voor de resetlink.");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-4">Wachtwoord vergeten</h1>

        <p className="text-slate-300 mb-6">
          Vul je e-mailadres in. Je ontvangt een link om je wachtwoord opnieuw in te stellen.
        </p>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded-lg bg-slate-800 mb-4"
        />

        <button
          onClick={sendResetEmail}
          className="w-full bg-white text-black font-bold p-3 rounded-lg"
        >
          Resetlink versturen
        </button>
      </div>
    </main>
  );
}