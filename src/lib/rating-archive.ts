import { supabase } from "@/src/lib/supabase";

export type RatingArchivePlayer = {
  player_id: number;
  player_name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  average_rating: number;
  rating_count: number;
};

export type RatingArchiveMatch = {
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  rating_deadline: string;
  finalized_at: string;
  players: RatingArchivePlayer[];
};

type RatingArchiveRaw = {
  matches?: Array<{
    match_id: number | string;
    home_team: string;
    away_team: string;
    kickoff: string;
    rating_deadline: string;
    finalized_at: string;
    players?: Array<{
      player_id: number | string;
      player_name: string;
      shirt_number: number | null;
      position: string | null;
      photo_url: string | null;
      average_rating: number | string;
      rating_count: number | string;
    }>;
  }>;
};

export async function getRatingArchive(): Promise<RatingArchiveMatch[]> {
  const { data, error } = await supabase.rpc("get_rating_archive");

  if (error) {
    throw new Error(
      `Archief spelersbeoordelingen ophalen mislukt: ${error.message}`,
    );
  }

  const result = data as unknown as RatingArchiveRaw;

  return (result.matches ?? []).map((match) => ({
    ...match,
    match_id: Number(match.match_id),
    players: (match.players ?? []).map((player) => ({
      ...player,
      player_id: Number(player.player_id),
      average_rating: Number(player.average_rating),
      rating_count: Number(player.rating_count),
    })),
  }));
}
