import { supabase } from "@/src/lib/supabase";

export type RatingAdminMatch = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
  rating_deadline: string;
  finalized_at: string | null;
  active_player_count: number;
};

export type RatingAdminPlayer = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  was_active: boolean;
  started_match: boolean;
  minutes_played: number | null;
};

type MatchRow = {
  id: number | string;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
};

type SettingRow = {
  match_id: number | string;
  rating_deadline: string | null;
  finalized_at: string | null;
};

type MatchRatingPlayerRow = {
  player_id: number | string;
  was_active: boolean;
  started_match: boolean;
  minutes_played: number | null;
};

type PlayerRow = {
  id: number | string;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
};

export async function ensureCoachAdmin(): Promise<void> {
  const { data, error } = await supabase.rpc("is_coach_admin");

  if (error) {
    throw new Error(`Adminrechten controleren mislukt: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "Je hebt geen beheerdersrechten voor Iedereen Coach.",
    );
  }
}

export async function getRatingAdminMatches(): Promise<RatingAdminMatch[]> {
  const { data: matchData, error: matchError } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff, status")
    .order("kickoff", { ascending: false });

  if (matchError) {
    throw new Error(`Wedstrijden ophalen mislukt: ${matchError.message}`);
  }

  const matches = (matchData ?? []) as unknown as MatchRow[];

  if (matches.length === 0) {
    return [];
  }

  const matchIds = matches.map((match) => Number(match.id));

  const [{ data: settingsData, error: settingsError }, {
    data: activeData,
    error: activeError,
  }] = await Promise.all([
    supabase
      .from("match_rating_settings")
      .select("match_id, rating_deadline, finalized_at")
      .in("match_id", matchIds),
    supabase
      .from("match_rating_players")
      .select("match_id")
      .eq("was_active", true)
      .in("match_id", matchIds),
  ]);

  if (settingsError) {
    throw new Error(
      `Beoordelingsinstellingen ophalen mislukt: ${settingsError.message}`,
    );
  }

  if (activeError) {
    throw new Error(
      `Actieve spelers ophalen mislukt: ${activeError.message}`,
    );
  }

  const settingsByMatch = new Map<number, SettingRow>(
    ((settingsData ?? []) as unknown as SettingRow[]).map((setting) => [
      Number(setting.match_id),
      setting,
    ]),
  );

  const activeCounts = new Map<number, number>();

  for (const row of (activeData ?? []) as Array<{ match_id: number | string }>) {
    const matchId = Number(row.match_id);
    activeCounts.set(matchId, (activeCounts.get(matchId) ?? 0) + 1);
  }

  return matches.map((match) => {
    const id = Number(match.id);
    const setting = settingsByMatch.get(id);
    const defaultDeadline = new Date(
      new Date(match.kickoff).getTime() + 48 * 60 * 60 * 1000,
    ).toISOString();

    return {
      id,
      home_team: match.home_team,
      away_team: match.away_team,
      kickoff: match.kickoff,
      status: match.status,
      rating_deadline: setting?.rating_deadline ?? defaultDeadline,
      finalized_at: setting?.finalized_at ?? null,
      active_player_count: activeCounts.get(id) ?? 0,
    };
  });
}

export async function getRatingAdminPlayers(
  matchId: number,
): Promise<RatingAdminPlayer[]> {
  const [{ data: playerData, error: playerError }, {
    data: configuredData,
    error: configuredError,
  }] = await Promise.all([
    supabase
      .from("players")
      .select("id, name, shirt_number, position, photo_url")
      .eq("active", true)
      .order("shirt_number", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true }),
    supabase
      .from("match_rating_players")
      .select("player_id, was_active, started_match, minutes_played")
      .eq("match_id", matchId),
  ]);

  if (playerError) {
    throw new Error(`Spelers ophalen mislukt: ${playerError.message}`);
  }

  if (configuredError) {
    throw new Error(
      `Wedstrijdspelers ophalen mislukt: ${configuredError.message}`,
    );
  }

  const configuredByPlayer = new Map<number, MatchRatingPlayerRow>(
    ((configuredData ?? []) as unknown as MatchRatingPlayerRow[]).map(
      (row) => [Number(row.player_id), row],
    ),
  );

  return ((playerData ?? []) as unknown as PlayerRow[]).map((player) => {
    const id = Number(player.id);
    const configured = configuredByPlayer.get(id);

    return {
      id,
      name: player.name,
      shirt_number: player.shirt_number,
      position: player.position,
      photo_url: player.photo_url,
      was_active: configured?.was_active ?? false,
      started_match: configured?.started_match ?? false,
      minutes_played: configured?.minutes_played ?? null,
    };
  });
}

export async function saveMatchRatingPlayers({
  matchId,
  players,
}: {
  matchId: number;
  players: RatingAdminPlayer[];
}): Promise<number> {
  const payload = players
    .filter((player) => player.was_active)
    .map((player) => ({
      player_id: player.id,
      was_active: true,
      started_match: player.started_match,
      minutes_played: player.minutes_played,
    }));

  const { data, error } = await supabase.rpc("set_match_rating_players", {
    target_match_id: matchId,
    target_players: payload,
  });

  if (error) {
    throw new Error(`Actieve spelers opslaan mislukt: ${error.message}`);
  }

  return Number(data ?? 0);
}

export async function saveMatchRatingDeadline({
  matchId,
  ratingDeadline,
}: {
  matchId: number;
  ratingDeadline: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc(
    "configure_match_rating_settings",
    {
      target_match_id: matchId,
      target_rating_deadline: ratingDeadline,
    },
  );

  if (error) {
    throw new Error(`Deadline opslaan mislukt: ${error.message}`);
  }
}

export async function finalizeMatchRatings(
  matchId: number,
): Promise<{
  finalized_player_count: number;
  calculated_score_count: number;
}> {
  const { data, error } = await supabase.rpc("finalize_match_ratings", {
    target_match_id: matchId,
  });

  if (error) {
    throw new Error(`Wedstrijd finaliseren mislukt: ${error.message}`);
  }

  const result = data as {
    finalized_player_count?: number;
    calculated_score_count?: number;
  } | null;

  return {
    finalized_player_count: Number(
      result?.finalized_player_count ?? 0,
    ),
    calculated_score_count: Number(
      result?.calculated_score_count ?? 0,
    ),
  };
}
