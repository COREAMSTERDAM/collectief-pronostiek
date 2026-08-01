import { supabase } from "@/src/lib/supabase";

export type CoachRankingRow = {
  position: number;
  user_id: string;
  coach_name: string;
  avatar_url: string | null;
  scored_matches: number;
  total_score: number;
  average_match_score: number;
  best_match_score: number;
  lowest_match_score: number;
  is_current_user: boolean;
};

export type CoachRanking = {
  team_id: number;
  generated_at: string;
  current_user_id: string | null;
  ranking: CoachRankingRow[];
};

export type CoachScoreHistoryRow = {
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  score: number;
  selected_player_count: number;
  scored_player_count: number;
  calculated_at: string;
};

export async function getCoachRanking(
  teamId: number,
): Promise<CoachRanking> {
  const { data, error } = await supabase.rpc("get_coach_ranking", {
    target_team_id: teamId,
  });

  if (error) {
    throw new Error(`Coachklassement ophalen mislukt: ${error.message}`);
  }

  return data as unknown as CoachRanking;
}

export async function getMyCoachScoreHistory(
  teamId: number,
): Promise<CoachScoreHistoryRow[]> {
  const { data, error } = await supabase.rpc(
    "get_my_coach_score_history",
    {
      target_team_id: teamId,
    },
  );

  if (error) {
    throw new Error(`Scorehistoriek ophalen mislukt: ${error.message}`);
  }

  const result = data as {
    matches?: CoachScoreHistoryRow[];
  } | null;

  return result?.matches ?? [];
}
