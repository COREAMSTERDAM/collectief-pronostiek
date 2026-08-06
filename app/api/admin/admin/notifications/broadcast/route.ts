import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/src/lib/require-authenticated-user";
import { getSupabaseAdmin } from "@/src/lib/supabase-admin";
import {
  createNotification,
  deliverNotificationPush,
  type NotificationPriority,
} from "@/src/lib/notifications/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BroadcastBody = {
  title?: string;
  body?: string;
  typeCode?: string;
  icon?: string;
  deepLink?: string;
  priority?: NotificationPriority;
  roleIds?: number[];
  sendPush?: boolean;
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Geen adminrechten." },
        { status: 403 },
      );
    }

    const [
      { data: roles, error: rolesError },
      { data: types, error: typesError },
    ] = await Promise.all([
      supabaseAdmin
        .from("community_roles")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
      supabaseAdmin.rpc("get_active_notification_types"),
    ]);

    if (rolesError) throw rolesError;
    if (typesError) throw typesError;

    return NextResponse.json({
      roles: roles ?? [],
      types: types ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Broadcastgegevens laden mislukt.",
      },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser(request);
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      return NextResponse.json(
        { error: "Geen adminrechten." },
        { status: 403 },
      );
    }

    const body = (await request.json()) as BroadcastBody;

    const title = body.title?.trim();
    const messageBody = body.body?.trim();
    const typeCode =
      body.typeCode?.trim() || "system_announcement";

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: "Titel en bericht zijn verplicht." },
        { status: 400 },
      );
    }

    if (title.length > 120 || messageBody.length > 1000) {
      return NextResponse.json(
        {
          error:
            "Titel mag maximaal 120 tekens bevatten en bericht maximaal 1000.",
        },
        { status: 400 },
      );
    }

    const roleIds = (body.roleIds ?? []).filter(
      (value): value is number =>
        Number.isInteger(value) && value > 0,
    );

    const { data: recipientRows, error: recipientError } =
      await supabaseAdmin.rpc(
        "get_broadcast_recipient_user_ids",
        {
          target_role_ids:
            roleIds.length > 0 ? roleIds : null,
        },
      );

    if (recipientError) throw recipientError;

    const recipientUserIds = (
      (recipientRows ?? []) as Array<{
        user_id: string;
      }>
    )
      .map((row) => row.user_id)
      .filter(Boolean);

    const sourceId = crypto.randomUUID();

    const { notificationId, recipientCount } =
      await createNotification({
        typeCode,
        sourceModule: "admin_broadcast",
        sourceId,
        title,
        body: messageBody,
        icon: body.icon?.trim() || "📢",
        deepLink: body.deepLink?.trim() || "/meldingen",
        priority: body.priority ?? "normal",
        senderUserId: user.id,
        metadata: {
          roleIds,
          broadcast: true,
        },
        recipientUserIds,
        pushRequested: body.sendPush ?? true,
      });

    if (!notificationId) {
      return NextResponse.json({
        success: true,
        notificationId: null,
        recipients: 0,
        sent: 0,
      });
    }

    const delivery =
      body.sendPush === false
        ? { sent: 0, failed: 0 }
        : await deliverNotificationPush(notificationId);

    return NextResponse.json({
      success: true,
      notificationId,
      recipients: recipientCount,
      ...delivery,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Broadcast versturen mislukt.",
      },
      { status: 500 },
    );
  }
}
