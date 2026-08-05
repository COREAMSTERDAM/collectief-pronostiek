import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PushSubscriptionPayload = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    const body = (await request.json()) as {
      subscription?: PushSubscriptionPayload;
      userAgent?: string;
      deviceLabel?: string;
    };

    const endpoint = body.subscription?.endpoint;
    const p256dh = body.subscription?.keys?.p256dh;
    const authSecret = body.subscription?.keys?.auth;

    if (!endpoint || !p256dh || !authSecret) {
      return NextResponse.json(
        { error: "Ongeldig pushabonnement." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("community_push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth_secret: authSecret,
          user_agent:
            body.userAgent?.slice(0, 1000) ?? null,
          device_label:
            body.deviceLabel?.slice(0, 120) ?? null,
          is_active: true,
          failure_count: 0,
          last_failure_at: null,
        },
        {
          onConflict: "endpoint",
        },
      );

    if (error) throw error;

    await supabaseAdmin
      .from("community_notification_preferences")
      .upsert(
        {
          user_id: user.id,
          push_enabled: true,
          all_messages: true,
        },
        {
          onConflict: "user_id",
        },
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pushabonnement opslaan mislukt.",
      },
      { status: 401 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);

    const body = (await request.json()) as {
      endpoint?: string;
    };

    if (!body.endpoint) {
      return NextResponse.json(
        { error: "Pushendpoint ontbreekt." },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("community_push_subscriptions")
      .delete()
      .eq("user_id", user.id)
      .eq("endpoint", body.endpoint);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Pushabonnement verwijderen mislukt.",
      },
      { status: 401 },
    );
  }
}
