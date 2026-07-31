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
