import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const supabaseAdmin = getSupabaseAdmin();

    const [
      { data: preference, error: preferenceError },
      { data: channelSettings, error: channelError },
    ] = await Promise.all([
      supabaseAdmin
        .from("community_notification_preferences")
        .select("push_enabled, all_messages")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("community_channel_notification_settings")
        .select("channel_id, is_muted")
        .eq("user_id", user.id),
    ]);

    if (preferenceError) throw preferenceError;
    if (channelError) throw channelError;

    return NextResponse.json({
      preference: preference ?? {
        push_enabled: true,
        all_messages: true,
      },
      channel_settings: channelSettings ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Voorkeuren ophalen mislukt.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    const body = (await request.json()) as {
      pushEnabled?: boolean;
      allMessages?: boolean;
      channelId?: number;
      isMuted?: boolean;
    };

    const supabaseAdmin = getSupabaseAdmin();

    if (
      typeof body.pushEnabled === "boolean" ||
      typeof body.allMessages === "boolean"
    ) {
      const payload: {
        user_id: string;
        push_enabled?: boolean;
        all_messages?: boolean;
      } = {
        user_id: user.id,
      };

      if (typeof body.pushEnabled === "boolean") {
        payload.push_enabled = body.pushEnabled;
      }

      if (typeof body.allMessages === "boolean") {
        payload.all_messages = body.allMessages;
      }

      const { error } = await supabaseAdmin
        .from("community_notification_preferences")
        .upsert(payload, {
          onConflict: "user_id",
        });

      if (error) throw error;
    }

    if (
      Number.isInteger(body.channelId) &&
      typeof body.isMuted === "boolean"
    ) {
      const { error } = await supabaseAdmin
        .from("community_channel_notification_settings")
        .upsert(
          {
            user_id: user.id,
            channel_id: body.channelId,
            is_muted: body.isMuted,
          },
          {
            onConflict: "user_id,channel_id",
          },
        );

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Voorkeuren opslaan mislukt.",
      },
      { status: 400 },
    );
  }
}
