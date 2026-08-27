import { createClient } from "@supabase/supabase-js";

export type RuaLevelSnapshot = {
  id: number;
  title: string;
  active: boolean;
  start: number;
  expiry: number;
};

export type RuaUserSnapshot = {
  wordpress_user_id: number;
  email: string;
  display_name: string;
  levels: RuaLevelSnapshot[];
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt.",
    );
  }

  return createClient(url, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function normalizeRuaLevel(title: string) {
  const value = title.trim().toLowerCase();

  if (
    value === "black member" ||
    value === "black member rol" ||
    value === "black-member" ||
    value === "black_member"
  ) {
    return "black_member";
  }

  if (
    value === "white member" ||
    value === "white member rol" ||
    value === "white-member" ||
    value === "white_member"
  ) {
    return "white_member";
  }

  return null;
}

function unixToIso(value: number) {
  if (!value || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}

function oneYearAfter(startIso: string | null) {
  const base = startIso ? new Date(startIso) : new Date();

  if (Number.isNaN(base.getTime())) {
    return new Date(
      Date.now() + 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  base.setDate(base.getDate() + 365);
  return base.toISOString();
}

async function findProfileBySnapshot(snapshot: RuaUserSnapshot) {
  const supabase = getServiceClient();

  const { data: byWordPressId } = await supabase
    .from("profiles")
    .select("id, email, wordpress_user_id")
    .eq("wordpress_user_id", snapshot.wordpress_user_id)
    .maybeSingle();

  if (byWordPressId) return byWordPressId;

  const email = snapshot.email.trim().toLowerCase();
  if (!email) return null;

  const { data: byEmail } = await supabase
    .from("profiles")
    .select("id, email, wordpress_user_id")
    .ilike("email", email)
    .limit(2);

  if (!byEmail || byEmail.length !== 1) {
    return null;
  }

  const profile = byEmail[0];

  if (
    profile.wordpress_user_id !== null &&
    Number(profile.wordpress_user_id) !== snapshot.wordpress_user_id
  ) {
    return null;
  }

  await supabase
    .from("profiles")
    .update({
      wordpress_user_id: snapshot.wordpress_user_id,
    })
    .eq("id", profile.id);

  return {
    ...profile,
    wordpress_user_id: snapshot.wordpress_user_id,
  };
}

export async function syncRuaUser(snapshot: RuaUserSnapshot) {
  const supabase = getServiceClient();
  const profile = await findProfileBySnapshot(snapshot);

  if (!profile) {
    return {
      linked: false,
      reason: "Geen unieke Supabase-profielmatch gevonden.",
    };
  }

  const now = new Date().toISOString();

  // WordPress / Restrict User Access beheert alleen memberships met bron wordpress_rua.
  // Handmatige admin-memberships (admin_manual) worden nooit door de sync gewijzigd.
  // Eerst zetten we de betaalde WordPress-memberships van deze gebruiker uit.
  // Daarna activeren we alleen de White/Black-levels die WordPress NU doorgeeft.
  //
  // Gevolg:
  // - geen White/Black in WordPress => gebruiker valt terug op Gast;
  // - White in WordPress => White actief;
  // - Black in WordPress => Black actief;
  // - oude initial_migration / foutieve betaalde records kunnen niet blijven winnen.
  const { error: resetError } = await supabase
    .from("user_memberships")
    .update({
      active: false,
      last_synced_at: now,
      updated_at: now,
    })
    .eq("user_id", profile.id)
    .eq("source", "wordpress_rua")
    .in("membership_level_key", ["white_member", "black_member"]);

  if (resetError) {
    throw new Error(
      `Bestaande betaalde memberships uitschakelen mislukt: ${resetError.message}`,
    );
  }

  const validLevels = snapshot.levels
    .map((level) => ({
      ...level,
      app_level_key: normalizeRuaLevel(level.title),
    }))
    .filter(
      (
        level,
      ): level is RuaLevelSnapshot & {
        app_level_key: "white_member" | "black_member";
      } => Boolean(level.app_level_key),
    );

  const incomingRefs = validLevels.map(
    (level) => `rua:${level.id}`,
  );

  for (const level of validLevels) {
    const sourceRef = `rua:${level.id}`;
    const startsAt = unixToIso(level.start) ?? now;
    const ruaExpiresAt = unixToIso(level.expiry);

    // White Member en Black Member zijn altijd maximaal 365 dagen geldig.
    // Als Restrict User Access geen einddatum doorgeeft (expiry = 0),
    // berekent de app zelf 365 dagen vanaf de startdatum.
    const expiresAt =
      level.app_level_key === "white_member" ||
      level.app_level_key === "black_member"
        ? ruaExpiresAt ?? oneYearAfter(startsAt)
        : ruaExpiresAt;

    const { error } = await supabase
      .from("user_memberships")
      .upsert(
        {
          user_id: profile.id,
          membership_level_key: level.app_level_key,
          source: "wordpress_rua",
          source_ref: sourceRef,
          starts_at: startsAt,
          expires_at: expiresAt,
          wordpress_user_id: snapshot.wordpress_user_id,
          rua_level_id: level.id,
          rua_level_title: level.title,
          last_synced_at: now,
          active: Boolean(level.active),
          updated_at: now,
        },
        {
          onConflict: "user_id,source,source_ref",
        },
      );

    if (error) {
      throw new Error(
        `RUA membership opslaan mislukt: ${error.message}`,
      );
    }
  }

  const { data: currentRows, error: currentError } = await supabase
    .from("user_memberships")
    .select("id, source_ref")
    .eq("user_id", profile.id)
    .eq("source", "wordpress_rua");

  if (currentError) {
    throw new Error(
      `Bestaande RUA memberships lezen mislukt: ${currentError.message}`,
    );
  }

  const staleIds = (currentRows ?? [])
    .filter(
      (row) =>
        !row.source_ref ||
        !incomingRefs.includes(row.source_ref),
    )
    .map((row) => row.id);

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from("user_memberships")
      .update({
        active: false,
        last_synced_at: now,
        updated_at: now,
      })
      .in("id", staleIds);

    if (error) {
      throw new Error(
        `Verouderde RUA memberships uitschakelen mislukt: ${error.message}`,
      );
    }
  }

  return {
    linked: true,
    user_id: profile.id,
    memberships: validLevels.length,
  };
}

export async function logMembershipSync(input: {
  mode: "user" | "full";
  status: "success" | "error";
  records: number;
  message?: string | null;
}) {
  const supabase = getServiceClient();

  await supabase
    .from("membership_sync_runs")
    .insert({
      source: "wordpress_rua",
      mode: input.mode,
      status: input.status,
      records: input.records,
      message: input.message ?? null,
    });
}
