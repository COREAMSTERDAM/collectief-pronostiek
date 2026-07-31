import { supabase } from "@/src/lib/supabase";

export type PlayerTrend = {
  player_id: number;
  player_name: string;
  photo_url: string | null;
  registered_position: string | null;
  current_coach_count: number;
  previous_coach_count: number;
  current_percentage: number;
  previous_percentage: number;
  percentage_change: number;
};

export type FormationTrend = {
  formation_id: number;
  formation_name: string;
  current_coach_count: number;
  previous_coach_count: number;
  current_percentage: number;
  previous_percentage: number;
  percentage_change: number;
};

export type PositionHeatmap = {
  position_code: string;
  position_label: string;
  position_group: string;
  coach_count: number;
  percentage_of_player_selections: number;
};

export type PlayerHeatmap = {
  player_id: number;
  player_name: string;
  photo_url: string | null;
  registered_position: string | null;
  coach_count: number;
  selection_percentage: number;
  positions: PositionHeatmap[];
};

export type HighlightPlayer = {
  player_id: number;
  player_name: string;
  photo_url: string | null;
  distinct_positions: number;
  coach_count: number;
  controversy_score?: number;
  positions: PositionHeatmap[];
};

export type CommunityAnalytics = {
  team_id: number;
  campaign_key: string | null;
  generated_at: string;
  total_coaches: number;
  trend_window: {
    current_days: number;
    previous_days: number;
    current_coaches: number;
    previous_coaches: number;
  };
  personal_community_overlap: {
    selected_count: number;
    overlap_count: number;
    percentage: number;
  };
  rising_players: PlayerTrend[];
  falling_players: PlayerTrend[];
  formation_trends: FormationTrend[];
  player_heatmaps: PlayerHeatmap[];
  most_versatile_player: HighlightPlayer | null;
  most_controversial_player: HighlightPlayer | null;
};

export async function getCommunityAnalytics(
  teamId: number,
  campaignKey = "iedereen-bondscoach",
): Promise<CommunityAnalytics> {
  const { data, error } = await supabase.rpc("get_community_analytics", {
    target_team_id: teamId,
    target_campaign_key: campaignKey,
  });

  if (error) {
    throw new Error(`Community analytics ophalen mislukt: ${error.message}`);
  }

  return data as unknown as CommunityAnalytics;
}
