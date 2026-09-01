import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAppAdmin } from "@/src/lib/require-app-admin";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: NextRequest) {
  try {
    await requireAppAdmin(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Geen logo ontvangen." }, { status: 400 });
    if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Gebruik PNG, JPG of WebP." }, { status: 400 });
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: "Logo mag maximaal 4 MB zijn." }, { status: 400 });

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `logos/${randomUUID()}.${ext}`;
    const admin = getSupabaseAdmin();
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error } = await admin.storage.from("supporter-club-logos").upload(path, bytes, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });
    if (error) throw new Error(`Logo uploaden mislukt: ${error.message}`);
    const { data } = admin.storage.from("supporter-club-logos").getPublicUrl(path);
    return NextResponse.json({ logo_url: data.publicUrl, logo_path: path });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Onbekende fout";
    const status = message.includes("beheerdersrechten") ? 403 : message.includes("sessie") || message.includes("aangemeld") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
