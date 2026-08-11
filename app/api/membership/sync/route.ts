import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  logMembershipSync,
  syncRuaUser,
  type RuaUserSnapshot,
} from "@/src/lib/membership-sync-server";

export const runtime = "nodejs";

function validSignature(rawBody: string, signature: string | null) {
  const secret = process.env.WORDPRESS_RUA_SYNC_SECRET;

  if (!secret || !signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (
    !validSignature(
      rawBody,
      request.headers.get("x-cwz-signature"),
    )
  ) {
    return NextResponse.json(
      { ok: false, error: "Ongeldige handtekening." },
      { status: 401 },
    );
  }

  try {
    const snapshot = JSON.parse(rawBody) as RuaUserSnapshot;
    const result = await syncRuaUser(snapshot);

    await logMembershipSync({
      mode: "user",
      status: "success",
      records: 1,
      message: result.linked
        ? `WordPress gebruiker ${snapshot.wordpress_user_id} gekoppeld.`
        : `WordPress gebruiker ${snapshot.wordpress_user_id}: geen profielmatch.`,
    });

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Onbekende synchronisatiefout.";

    await logMembershipSync({
      mode: "user",
      status: "error",
      records: 0,
      message,
    });

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
