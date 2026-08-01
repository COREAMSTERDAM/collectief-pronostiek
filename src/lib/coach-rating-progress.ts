import { supabase } from "@/src/lib/supabase";

export type MatchRatingProgress = {
  match_id: number;
  active_player_count: number;
  supporters_started: number;
  supporters_completed: number;
  total_saved_ratings: number;
  current_user_rated_count: number;
  current_user_completed: boolean;
};

export type RatingUserStatus = {
  user_id: string;
  name: string;
  rated_player_count: number;
  completed: boolean;
  status: "completed" | "partial" | "not_started";
};

export type RatingPlayerCount = {
  player_id: number;
  player_name: string;
  shirt_number: number | null;
  position: string | null;
  rating_count: number;
};

export type MatchRatingAdminProgress = {
  match_id: number;
  active_player_count: number;
  total_supporters: number;
  supporters_started: number;
  supporters_completed: number;
  supporters_partial: number;
  supporters_not_started: number;
  total_saved_ratings: number;
  users: RatingUserStatus[];
  players: RatingPlayerCount[];
};

export async function getMatchRatingProgress(
  matchId: number,
): Promise<MatchRatingProgress> {
  const { data, error } = await supabase.rpc(
    "get_match_rating_progress",
    {
      target_match_id: matchId,
    },
  );

  if (error) {
    throw new Error(
      `Beoordelingsvoortgang ophalen mislukt: ${error.message}`,
    );
  }

  return data as unknown as MatchRatingProgress;
}

export async function getMatchRatingAdminProgress(
  matchId: number,
): Promise<MatchRatingAdminProgress> {
  const { data, error } = await supabase.rpc(
    "get_match_rating_admin_progress",
    {
      target_match_id: matchId,
    },
  );

  if (error) {
    throw new Error(
      `Adminvoortgang ophalen mislukt: ${error.message}`,
    );
  }

  return data as unknown as MatchRatingAdminProgress;
}
