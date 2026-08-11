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
    const body = JSON.parse(rawBody) as {
      users: RuaUserSnapshot[];
    };

    const users = Array.isArray(body.users) ? body.users : [];
    let linked = 0;

    for (const snapshot of users) {
      const result = await syncRuaUser(snapshot);
      if (result.linked) linked += 1;
    }

    await logMembershipSync({
      mode: "full",
      status: "success",
      records: users.length,
      message: `${linked} van ${users.length} WordPress gebruikers gekoppeld.`,
    });

    return NextResponse.json({
      ok: true,
      received: users.length,
      linked,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Onbekende synchronisatiefout.";

    await logMembershipSync({
      mode: "full",
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
