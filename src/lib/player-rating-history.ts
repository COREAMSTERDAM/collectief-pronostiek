import { supabase } from "@/src/lib/supabase";

export type PlayerRatingHistoryOverviewRow = {
  player_id: number;
  player_name: string;
  shirt_number: number | null;
  registered_position: string | null;
  photo_url: string | null;
  finished_matches: number;
  overall_average: number;
  highest_rating: number;
  lowest_rating: number;
  total_votes: number;
  latest_finalized_at: string;
};

export type PlayerRatingMatchRow = {
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  average_rating: number;
  rating_count: number;
  finalized_at: string;
};

export type PlayerRatingHistoryDetail = {
  team_id: number;
  player: {
    player_id: number;
    player_name: string;
    shirt_number: number | null;
    registered_position: string | null;
    photo_url: string | null;
  } | null;
  summary: {
    finished_matches: number;
    overall_average: number | null;
    highest_rating: number | null;
    lowest_rating: number | null;
    total_votes: number | null;
  };
  matches: PlayerRatingMatchRow[];
};

export async function getPlayerRatingHistoryOverview(
  teamId: number,
): Promise<PlayerRatingHistoryOverviewRow[]> {
  const { data, error } = await supabase.rpc(
    "get_player_rating_history_overview",
    {
      target_team_id: teamId,
    },
  );

  if (error) {
    throw new Error(`Spelershistoriek ophalen mislukt: ${error.message}`);
  }

  const result = data as {
    players?: PlayerRatingHistoryOverviewRow[];
  } | null;

  return result?.players ?? [];
}

export async function getPlayerRatingHistoryDetail(
  teamId: number,
  playerId: number,
): Promise<PlayerRatingHistoryDetail> {
  const { data, error } = await supabase.rpc(
    "get_player_rating_history_detail",
    {
      target_team_id: teamId,
      target_player_id: playerId,
    },
  );

  if (error) {
    throw new Error(`Spelerdetail ophalen mislukt: ${error.message}`);
  }

  return data as unknown as PlayerRatingHistoryDetail;
}
