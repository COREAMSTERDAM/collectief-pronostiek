import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import {
  buildPreviewFacts,
  generateAiMatchPreview,
  type MatchRow,
} from "@/src/lib/ai-match-preview";

function statusForError(message: string) {
  return /Niet aangemeld|Ongeldige sessie|verlopen sessie/.test(message) ? 401 :
    /beheerdersrechten/.test(message) ? 403 : 500;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    await requireAppAdmin(request);
    const { matchId } = await context.params;
    const id = Number(matchId);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Ongeldige wedstrijd." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("ai_match_previews")
      .select("id, match_id, content, model, generated_at, updated_at, is_published")
      .eq("match_id", id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return NextResponse.json({ preview: data ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voorbeschouwing laden mislukt.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ matchId: string }> },
) {
  try {
    const user = await requireAppAdmin(request);
    const { matchId } = await context.params;
    const id = Number(matchId);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Ongeldige wedstrijd." }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, home_team, away_team, kickoff, status, home_score, away_score")
      .eq("id", id)
      .maybeSingle();

    if (matchError) throw new Error(matchError.message);
    if (!match) return NextResponse.json({ error: "Wedstrijd niet gevonden." }, { status: 404 });

    const facts = await buildPreviewFacts(match as MatchRow);
    const generated = await generateAiMatchPreview(facts);
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("ai_match_previews")
      .upsert(
        {
          match_id: id,
          content: generated.content,
          source_snapshot: facts,
          model: generated.model,
          generated_by: user.id,
          generated_at: now,
          updated_at: now,
        },
        { onConflict: "match_id" },
      )
      .select("id, match_id, content, model, generated_at, updated_at, is_published")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ preview: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voorbeschouwing genereren mislukt.";
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
