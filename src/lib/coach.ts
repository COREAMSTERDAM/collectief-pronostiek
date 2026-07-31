import { supabase } from "@/src/lib/supabase";

export type Formation = {
  id: number;
  name: string;
  description: string | null;
  player_count: number;
};

export type FormationPosition = {
  id: number;
  formation_id: number;
  position_code: string;
  position_label: string;
  position_group: "goalkeeper" | "defender" | "midfielder" | "forward";
  x_percent: number;
  y_percent: number;
  sort_order: number;
};

export type CoachPlayer = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
};

export type CoachTeam = {
  id: number;
  slug: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

export type SavedLineup = {
  id: string;
  team_id: number;
  formation_id: number;
  is_complete: boolean;
  updated_at: string;
  playerAssignments: Array<{
    formation_position_id: number;
    player_id: number;
  }>;
};

export type CollectiveFormationStat = {
  formation_id: number;
  formation_name: string;
  description: string | null;
  coach_count: number;
  percentage: number;
};

export type CollectiveLineupPlayer = {
  position_code: string;
  position_label: string;
  position_group: FormationPosition["position_group"];
  x_percent: number;
  y_percent: number;
  sort_order: number;
  player_id: number;
  player_name: string;
  shirt_number: number | null;
  registered_position: string | null;
  photo_url: string | null;
  votes: number;
  position_percentage: number;
};

export type CollectiveTopPlayer = {
  player_id: number;
  player_name: string;
  shirt_number: number | null;
  registered_position: string | null;
  photo_url: string | null;
  coach_count: number;
  selection_percentage: number;
};

export type CollectiveDashboard = {
  team_id: number;
  campaign_key: string | null;
  total_coaches: number;
  total_submissions: number;
  latest_submission_at: string | null;
  most_popular_formation: CollectiveFormationStat | null;
  formations: CollectiveFormationStat[];
  collective_lineup: CollectiveLineupPlayer[];
  top_players: CollectiveTopPlayer[];
};

type FormationRow = {
  id: number;
  name: string;
  description: string | null;
  player_count: number;
};

type FormationPositionRow = {
  id: number;
  formation_id: number;
  position_code: string;
  position_label: string;
  position_group: FormationPosition["position_group"];
  x_percent: number | string;
  y_percent: number | string;
  sort_order: number;
};

type CoachPlayerRow = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
};

type CoachTeamRow = {
  id: number;
  slug: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type UserLineupRow = {
  id: string;
  team_id: number;
  formation_id: number;
  is_complete: boolean;
  updated_at: string;
};

type UserLineupPlayerRow = {
  formation_position_id: number;
  player_id: number;
};

export async function getActiveFormations(): Promise<Formation[]> {
  const { data, error } = await supabase
    .from("formations")
    .select("id, name, description, player_count")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Formaties ophalen mislukt: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as FormationRow[];

  return rows.map((formation) => ({
    ...formation,
    player_count: Number(formation.player_count),
  }));
}

export async function getFormationPositions(
  formationId: number,
): Promise<FormationPosition[]> {
  const { data, error } = await supabase
    .from("formation_positions")
    .select(
      "id, formation_id, position_code, position_label, position_group, x_percent, y_percent, sort_order",
    )
    .eq("formation_id", formationId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Formatieposities ophalen mislukt: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as FormationPositionRow[];

  return rows.map((position) => ({
    ...position,
    x_percent: Number(position.x_percent),
    y_percent: Number(position.y_percent),
    sort_order: Number(position.sort_order),
  }));
}

export async function getActiveCoachPlayers(): Promise<CoachPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, shirt_number, position, photo_url")
    .eq("active", true)
    .order("shirt_number", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Spelers ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as unknown as CoachPlayerRow[];
}

export async function getActiveCoachTeams(): Promise<CoachTeam[]> {
  const { data, error } = await supabase
    .from("coach_teams")
    .select("id, slug, name, short_name, logo_url")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Teams ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as unknown as CoachTeamRow[];
}

export async function getSavedUserLineup(
  teamId: number,
): Promise<SavedLineup | null> {
  const { data: userData, error: userError } =
    await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new Error("Je moet aangemeld zijn om je opstelling te laden.");
  }

  const { data: lineupData, error: lineupError } = await supabase
    .from("user_lineups")
    .select("id, team_id, formation_id, is_complete, updated_at")
    .eq("user_id", userData.user.id)
    .eq("team_id", teamId)
    .maybeSingle();

  if (lineupError) {
    throw new Error(`Opstelling ophalen mislukt: ${lineupError.message}`);
  }

  if (!lineupData) {
    return null;
  }

  const lineup = lineupData as unknown as UserLineupRow;

  const { data: playerData, error: playerError } = await supabase
    .from("user_lineup_players")
    .select("formation_position_id, player_id")
    .eq("lineup_id", lineup.id);

  if (playerError) {
    throw new Error(
      `Opgestelde spelers ophalen mislukt: ${playerError.message}`,
    );
  }

  const playerAssignments =
    (playerData ?? []) as unknown as UserLineupPlayerRow[];

  return {
    ...lineup,
    team_id: Number(lineup.team_id),
    formation_id: Number(lineup.formation_id),
    playerAssignments: playerAssignments.map((assignment) => ({
      formation_position_id: Number(assignment.formation_position_id),
      player_id: Number(assignment.player_id),
    })),
  };
}

export async function saveUserLineup({
  teamId,
  formationId,
  assignments,
}: {
  teamId: number;
  formationId: number;
  assignments: Array<{
    formationPositionId: number;
    playerId: number;
  }>;
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_user_lineup", {
    target_team_id: teamId,
    target_formation_id: formationId,
    target_players: assignments.map((assignment) => ({
      formation_position_id: assignment.formationPositionId,
      player_id: assignment.playerId,
    })),
    target_title: null,
  });

  if (error) {
    throw new Error(`Opstelling bewaren mislukt: ${error.message}`);
  }

  if (typeof data !== "string") {
    throw new Error("De opgeslagen opstelling gaf geen geldig ID terug.");
  }

  return data;
}

export async function submitSavedUserLineup(
  lineupId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("submit_user_lineup", {
    target_lineup_id: lineupId,
    target_match_id: null,
    target_campaign_key: "iedereen-bondscoach",
  });

  if (error) {
    throw new Error(`Opstelling indienen mislukt: ${error.message}`);
  }

  if (typeof data !== "string") {
    throw new Error("De ingediende opstelling gaf geen geldig ID terug.");
  }

  return data;
}

export async function getCollectiveLineupDashboard(
  teamId: number,
  campaignKey = "iedereen-bondscoach",
): Promise<CollectiveDashboard> {
  const { data, error } = await supabase.rpc(
    "get_collective_lineup_dashboard",
    {
      target_team_id: teamId,
      target_campaign_key: campaignKey,
    },
  );

  if (error) {
    throw new Error(
      `Collectieve statistieken ophalen mislukt: ${error.message}`,
    );
  }

  const dashboard = data as unknown as CollectiveDashboard;

  return {
    team_id: Number(dashboard.team_id),
    campaign_key: dashboard.campaign_key ?? null,
    total_coaches: Number(dashboard.total_coaches ?? 0),
    total_submissions: Number(dashboard.total_submissions ?? 0),
    latest_submission_at: dashboard.latest_submission_at ?? null,
    most_popular_formation: dashboard.most_popular_formation
      ? {
          ...dashboard.most_popular_formation,
          formation_id: Number(
            dashboard.most_popular_formation.formation_id,
          ),
          coach_count: Number(
            dashboard.most_popular_formation.coach_count,
          ),
          percentage: Number(
            dashboard.most_popular_formation.percentage,
          ),
        }
      : null,
    formations: (dashboard.formations ?? []).map((formation) => ({
      ...formation,
      formation_id: Number(formation.formation_id),
      coach_count: Number(formation.coach_count),
      percentage: Number(formation.percentage),
    })),
    collective_lineup: (dashboard.collective_lineup ?? []).map(
      (player) => ({
        ...player,
        x_percent: Number(player.x_percent),
        y_percent: Number(player.y_percent),
        sort_order: Number(player.sort_order),
        player_id: Number(player.player_id),
        votes: Number(player.votes),
        position_percentage: Number(player.position_percentage),
      }),
    ),
    top_players: (dashboard.top_players ?? []).map((player) => ({
      ...player,
      player_id: Number(player.player_id),
      coach_count: Number(player.coach_count),
      selection_percentage: Number(player.selection_percentage),
    })),
  };
}
