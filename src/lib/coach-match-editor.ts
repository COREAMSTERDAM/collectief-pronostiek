import { supabase } from "@/src/lib/supabase";

export type CoachMatch = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
};

export type MatchLineupAssignment = {
  formation_position_id: number;
  player_id: number;
};

export type MatchLineup = {
  id: string;
  team_id: number;
  match_id: number;
  formation_id: number;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
  deadline: string;
  is_open: boolean;
  player_assignments: MatchLineupAssignment[];
};

type CoachMatchRow = {
  id: number | string;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
};

export async function getCoachMatch(
  matchId: number,
): Promise<CoachMatch | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("id, home_team, away_team, kickoff, status")
    .eq("id", matchId)
    .maybeSingle();

  if (error) {
    throw new Error(`Wedstrijd ophalen mislukt: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const row = data as unknown as CoachMatchRow;

  return {
    ...row,
    id: Number(row.id),
  };
}

export async function getMyMatchLineup(
  teamId: number,
  matchId: number,
): Promise<MatchLineup | null> {
  const { data, error } = await supabase.rpc("get_my_match_lineup", {
    target_team_id: teamId,
    target_match_id: matchId,
  });

  if (error) {
    throw new Error(`Wedstrijdopstelling ophalen mislukt: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const lineup = data as unknown as MatchLineup;

  return {
    ...lineup,
    team_id: Number(lineup.team_id),
    match_id: Number(lineup.match_id),
    formation_id: Number(lineup.formation_id),
    is_complete: Boolean(lineup.is_complete),
    is_open: Boolean(lineup.is_open),
    player_assignments: (lineup.player_assignments ?? []).map(
      (assignment) => ({
        formation_position_id: Number(
          assignment.formation_position_id,
        ),
        player_id: Number(assignment.player_id),
      }),
    ),
  };
}

export async function saveMatchLineup({
  teamId,
  matchId,
  formationId,
  assignments,
}: {
  teamId: number;
  matchId: number;
  formationId: number;
  assignments: Array<{
    formationPositionId: number;
    playerId: number;
  }>;
}): Promise<string> {
  const { data, error } = await supabase.rpc("save_match_lineup", {
    target_team_id: teamId,
    target_match_id: matchId,
    target_formation_id: formationId,
    target_players: assignments.map((assignment) => ({
      formation_position_id: assignment.formationPositionId,
      player_id: assignment.playerId,
    })),
    target_title: null,
  });

  if (error) {
    throw new Error(`Wedstrijdopstelling bewaren mislukt: ${error.message}`);
  }

  if (typeof data !== "string") {
    throw new Error("De opgeslagen opstelling gaf geen geldig ID terug.");
  }

  return data;
}

export async function submitMatchLineup(
  lineupId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("submit_match_lineup", {
    target_lineup_id: lineupId,
  });

  if (error) {
    throw new Error(`Wedstrijdopstelling indienen mislukt: ${error.message}`);
  }

  if (typeof data !== "string") {
    throw new Error("De inzending gaf geen geldig ID terug.");
  }

  return data;
}
