import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Deze oude route verstuurt bewust niets meer.
 * Community gebruikt voortaan /api/notifications/community-message.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Deze route is vervangen door de centrale Notification Engine.",
      replacement: "/api/notifications/community-message",
    },
    { status: 410 },
  );
}
