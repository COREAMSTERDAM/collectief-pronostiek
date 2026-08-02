import { supabase } from "@/src/lib/supabase";

export type OpenRatingMatch = {
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  rating_deadline: string;
  active_player_count: number;
  my_rating_count: number;
  is_complete: boolean;
};

type OpenRatingMatchRaw = Omit<OpenRatingMatch, "match_id" | "active_player_count" | "my_rating_count"> & {
  match_id: number | string;
  active_player_count: number | string;
  my_rating_count: number | string;
};

export async function getOpenMatchRatings(): Promise<OpenRatingMatch[]> {
  const { data, error } = await supabase.rpc("get_open_match_ratings");

  if (error) {
    throw new Error(`Open spelersbeoordelingen ophalen mislukt: ${error.message}`);
  }

  const result = data as { matches?: OpenRatingMatchRaw[] } | null;

  return (result?.matches ?? []).map((match) => ({
    ...match,
    match_id: Number(match.match_id),
    active_player_count: Number(match.active_player_count),
    my_rating_count: Number(match.my_rating_count),
  }));
}
