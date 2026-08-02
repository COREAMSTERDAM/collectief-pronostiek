import { supabase } from "@/src/lib/supabase";

export type CoachMatch = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  status: string | null;
};

export type MatchLineupAssignment = {
  selection_type: "starter" | "substitute";
  formation_position_id: number | null;
  bench_order: number | null;
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

  if (!data) return null;

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

  if (!data) return null;

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
        selection_type:
          assignment.selection_type === "substitute"
            ? "substitute"
            : "starter",
        formation_position_id:
          assignment.formation_position_id === null
            ? null
            : Number(assignment.formation_position_id),
        bench_order:
          assignment.bench_order === null
            ? null
            : Number(assignment.bench_order),
        player_id: Number(assignment.player_id),
      }),
    ),
  };
}

export async function saveMatchLineup({
  teamId,
  matchId,
  formationId,
  starterAssignments,
  substituteAssignments,
}: {
  teamId: number;
  matchId: number;
  formationId: number;
  starterAssignments: Array<{
    formationPositionId: number;
    playerId: number;
  }>;
  substituteAssignments: Array<{
    benchOrder: number;
    playerId: number;
  }>;
}): Promise<string> {
  const targetPlayers = [
    ...starterAssignments.map((assignment) => ({
      selection_type: "starter",
      formation_position_id: assignment.formationPositionId,
      bench_order: null,
      player_id: assignment.playerId,
    })),
    ...substituteAssignments.map((assignment) => ({
      selection_type: "substitute",
      formation_position_id: null,
      bench_order: assignment.benchOrder,
      player_id: assignment.playerId,
    })),
  ];

  const { data, error } = await supabase.rpc("save_match_lineup", {
    target_team_id: teamId,
    target_match_id: matchId,
    target_formation_id: formationId,
    target_players: targetPlayers,
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
