import { supabase } from "@/src/lib/supabase";
import type {
  CollectiveFormationStat,
  CollectiveLineupPlayer,
  CollectiveTopPlayer,
} from "@/src/lib/coach";

export type AllMatchesSummaryRow = {
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  lineup_count: number;
  coach_count: number;
  latest_submission_at: string | null;
};

export type AllMatchesCollectiveDashboard = {
  team_id: number;
  unique_coaches: number;
  total_match_lineups: number;
  matches_with_data: number;
  latest_submission_at: string | null;
  most_popular_formation: CollectiveFormationStat | null;
  formations: CollectiveFormationStat[];
  collective_lineup: CollectiveLineupPlayer[];
  top_players: CollectiveTopPlayer[];
  matches: AllMatchesSummaryRow[];
};

export async function getAllMatchesCollectiveDashboard(
  teamId: number,
): Promise<AllMatchesCollectiveDashboard> {
  const { data, error } = await supabase.rpc(
    "get_all_match_collective_dashboard",
    {
      target_team_id: teamId,
    },
  );

  if (error) {
    throw new Error(
      `Totaaloverzicht ophalen mislukt: ${error.message}`,
    );
  }

  return data as unknown as AllMatchesCollectiveDashboard;
}
