import { supabase } from "@/src/lib/supabase";

export type SeparateCoachRankingRow = {
  position: number;
  user_id: string;
  coach_name: string;
  avatar_url: string | null;
  scored_matches: number;
  total_points: number;
  average_points: number;
  best_match_points: number;
  is_current_user: boolean;
};

export type SeparateCoachRanking = {
  team_id: number;
  current_user_id: string | null;
  ranking: SeparateCoachRankingRow[];
};

export type MyCoachMatchScore = {
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  score: number;
  selected_player_count: number;
  scored_player_count: number;
  calculated_at: string;
};

export async function getSeparateCoachRanking(
  teamId: number,
): Promise<SeparateCoachRanking> {
  const { data, error } = await supabase.rpc(
    "get_separate_coach_ranking",
    {
      target_team_id: teamId,
    },
  );

  if (error) {
    throw new Error(
      `Coachklassement ophalen mislukt: ${error.message}`,
    );
  }

  const result = data as unknown as SeparateCoachRanking;

  return {
    ...result,
    ranking: (result.ranking ?? []).map((row) => ({
      ...row,
      position: Number(row.position),
      scored_matches: Number(row.scored_matches),
      total_points: Number(row.total_points),
      average_points: Number(row.average_points),
      best_match_points: Number(row.best_match_points),
    })),
  };
}

export async function getMySeparateCoachScores(
  teamId: number,
): Promise<MyCoachMatchScore[]> {
  const { data, error } = await supabase.rpc(
    "get_my_separate_coach_scores",
    {
      target_team_id: teamId,
    },
  );

  if (error) {
    throw new Error(
      `Persoonlijke coachscores ophalen mislukt: ${error.message}`,
    );
  }

  const result = data as {
    matches?: MyCoachMatchScore[];
  } | null;

  return (result?.matches ?? []).map((match) => ({
    ...match,
    match_id: Number(match.match_id),
    score: Number(match.score),
    selected_player_count: Number(match.selected_player_count),
    scored_player_count: Number(match.scored_player_count),
  }));
}

export async function recalculateCoachScoresForMatch(
  matchId: number,
): Promise<number> {
  const { data, error } = await supabase.rpc(
    "recalculate_coach_scores_for_match",
    {
      target_match_id: matchId,
    },
  );

  if (error) {
    throw new Error(
      `Coachscores herberekenen mislukt: ${error.message}`,
    );
  }

  return Number(data ?? 0);
}
