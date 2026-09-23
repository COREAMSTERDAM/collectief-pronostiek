import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";

type PlayerStatUpdate = {
  id: number;
  goals: number;
  yellow_cards: number;
};

function normalizeCount(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
    throw new Error(`${label} moet een geheel getal tussen 0 en 999 zijn.`);
  }
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from("players")
      .select("id,name,shirt_number,position,active,goals,yellow_cards")
      .eq("active", true)
      .order("shirt_number", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ players: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Spelersstatistieken laden mislukt." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const body = await request.json();
    const updates = Array.isArray(body?.updates) ? body.updates : [];

    if (!updates.length) {
      throw new Error("Geen wijzigingen ontvangen.");
    }

    const supabaseAdmin = getSupabaseAdmin();

    for (const raw of updates as PlayerStatUpdate[]) {
      const id = Number(raw.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error("Ongeldige speler.");

      const goals = normalizeCount(raw.goals, "Doelpunten");
      const yellowCards = normalizeCount(raw.yellow_cards, "Gele kaarten");

      const { error } = await supabaseAdmin
        .from("players")
        .update({ goals, yellow_cards: yellowCards })
        .eq("id", id);

      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Opslaan mislukt." },
      { status: 400 },
    );
  }
}
