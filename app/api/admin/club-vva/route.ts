import { NextRequest, NextResponse } from "next/server";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { fetchVvaClubData } from "@/src/lib/vva-club-data";

export async function GET(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const data = await fetchVvaClubData();
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout.";
    const unauthorized = /aangemeld|sessie|beheerdersrechten/i.test(message);
    return NextResponse.json(
      { error: message },
      { status: unauthorized ? 403 : 500 },
    );
  }
}
