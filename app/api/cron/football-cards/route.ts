import { NextRequest, NextResponse } from "next/server";
import { rememberFootballCardsError, syncFootballCards } from "@/src/lib/voetbal-vlaanderen-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;


function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const header = request.headers.get("x-cron-secret")?.trim();
  return bearer === secret || header === secret;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncFootballCards();
    return NextResponse.json({ ok: true, records: result.records.length, fetched_at: result.fetchedAt });
  } catch (error) {
    await rememberFootballCardsError(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Onbekende fout." }, { status: 500 });
  }
}