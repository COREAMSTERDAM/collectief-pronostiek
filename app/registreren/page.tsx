"use client";

import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function RegistrerenPage() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [akkoord, setAkkoord] = useState(false);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md mx-auto pt-10">
        <h1 className="text-3xl font-bold mb-6">Registreren</h1>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();

            if (!naam || !email || !wachtwoord) {
              alert("Vul alle velden in.");
              return;
            }

            if (!akkoord) {
              alert("Je moet akkoord gaan met het reglement.");
              return;
            }

            const { data, error } = await supabase.auth.signUp({
              email,
              password: wachtwoord,
              options: {
                data: {
                  name: naam,
                },
              },
            });

            if (error) {
              alert(error.message);
              return;
            }

            if (data.user) {
              const { error: profileError } = await supabase
                .from("profiles")
                .insert({
                  id: data.user.id,
                  name: naam,
                  accepted_rules: true,
                  accepted_rules_at: new Date().toISOString(),
                });

              if (profileError) {
                alert(profileError.message);
                return;
              }
            }

            alert("Registratie gelukt! Controleer je mailbox.");
          }}
        >
          <input
            type="text"
            placeholder="Naam"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            className="w-full p-3 rounded-lg bg-slate-800"
          />

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

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={akkoord}
              onChange={(e) => setAkkoord(e.target.checked)}
            />
            Ik ga akkoord met het reglement
          </label>

          <button
            type="submit"
            className="w-full bg-white text-black font-bold p-3 rounded-lg"
          >
            Registreren
          </button>
        </form>
      </div>
    </main>
  );
}