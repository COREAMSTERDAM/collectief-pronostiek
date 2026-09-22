import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { buildFootballCardsDiagnostics } from "@/src/lib/voetbal-vlaanderen-cards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const diagnostic = await buildFootballCardsDiagnostics();
    return new NextResponse(JSON.stringify(diagnostic, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="voetbal-vlaanderen-kaarten-diagnose.json"',
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    return NextResponse.json(
      { error: message },
      { status: /aangemeld|sessie|beheerdersrechten/i.test(message) ? 403 : 500 },
    );
  }
}
