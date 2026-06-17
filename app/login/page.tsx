"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Inloggen</h1>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();

            const { error } = await supabase.auth.signInWithPassword({
              email,
              password: wachtwoord,
            });

            if (error) {
              alert(error.message);
              return;
            }

            window.location.href = "/";
          }}
        >
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800"
          />

          <input
            type="password"
            placeholder="Wachtwoord"
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800"
          />

          <button
            type="submit"
            className="w-full bg-white text-black font-bold p-3 rounded-lg"
          >
            Inloggen
          </button>

          <a
            href="/wachtwoord-vergeten"
            className="block text-center text-slate-300 underline mt-4"
          >
            Wachtwoord vergeten?
          </a>
        </form>
      </div>
    </main>
  );
}