import { supabase } from "@/src/lib/supabase";

export type ClosedCoachLineup = {
  lineup_id: string;
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  lineup_deadline: string;
  formation_id: number | null;
  formation_name: string | null;
  selected_player_count: number;
  is_complete: boolean;
  has_submission: boolean;
  coach_score: number | null;
  updated_at: string;
};

type ClosedCoachLineupRaw = {
  lineup_id: string;
  match_id: number | string;
  home_team: string;
  away_team: string;
  kickoff: string;
  lineup_deadline: string;
  formation_id: number | string | null;
  formation_name: string | null;
  selected_player_count: number | string;
  is_complete: boolean;
  has_submission: boolean;
  coach_score: number | string | null;
  updated_at: string;
};

export async function getMyClosedLineups(
  teamId: number,
): Promise<ClosedCoachLineup[]> {
  const { data, error } = await supabase.rpc(
    "get_my_closed_lineups",
    {
      target_team_id: teamId,
    },
  );

  if (error) {
    throw new Error(
      `Eerdere opstellingen ophalen mislukt: ${error.message}`,
    );
  }

  const result = data as {
    lineups?: ClosedCoachLineupRaw[];
  } | null;

  return (result?.lineups ?? []).map((lineup) => ({
    ...lineup,
    match_id: Number(lineup.match_id),
    formation_id:
      lineup.formation_id === null
        ? null
        : Number(lineup.formation_id),
    selected_player_count: Number(lineup.selected_player_count),
    coach_score:
      lineup.coach_score === null
        ? null
        : Number(lineup.coach_score),
  }));
}
