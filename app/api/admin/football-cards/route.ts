import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import {
  getCachedFootballCards,
  rememberFootballCardsError,
  syncFootballCards,
} from "@/src/lib/voetbal-vlaanderen-cards";

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    return NextResponse.json(await getCachedFootballCards());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    return NextResponse.json({ error: message }, { status: /aangemeld|sessie|beheerdersrechten/i.test(message) ? 403 : 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    await syncFootballCards();
    return NextResponse.json(await getCachedFootballCards());
  } catch (error) {
    await rememberFootballCardsError(error);
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    return NextResponse.json({ error: message }, { status: /aangemeld|sessie|beheerdersrechten/i.test(message) ? 403 : 500 });
  }
}
