import { supabase } from "@/src/lib/supabase";

export type MatchRatingPlayer = {
  player_id: number;
  player_name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  started_match: boolean;
  minutes_played: number | null;
  my_rating: number | null;
  final_average: number | null;
  rating_count: number | null;
};

export type MatchRatingsOverview = {
  match_id: number;
  deadline: string;
  is_open: boolean;
  is_finalized: boolean;
  players: MatchRatingPlayer[];
};

type MatchRatingsOverviewRaw = {
  match_id: number | string;
  deadline: string;
  is_open: boolean;
  is_finalized: boolean;
  players: Array<{
    player_id: number | string;
    player_name: string;
    shirt_number: number | null;
    position: string | null;
    photo_url: string | null;
    started_match: boolean;
    minutes_played: number | null;
    my_rating: number | string | null;
    final_average: number | string | null;
    rating_count: number | string | null;
  }>;
};

export async function getMyMatchRatings(
  matchId: number,
): Promise<MatchRatingsOverview> {
  const { data, error } = await supabase.rpc("get_my_match_ratings", {
    target_match_id: matchId,
  });

  if (error) {
    throw new Error(
      `Spelersbeoordelingen ophalen mislukt: ${error.message}`,
    );
  }

  const result = data as unknown as MatchRatingsOverviewRaw;

  return {
    match_id: Number(result.match_id),
    deadline: result.deadline,
    is_open: Boolean(result.is_open),
    is_finalized: Boolean(result.is_finalized),
    players: (result.players ?? []).map((player) => ({
      ...player,
      player_id: Number(player.player_id),
      my_rating:
        player.my_rating === null ? null : Number(player.my_rating),
      final_average:
        player.final_average === null
          ? null
          : Number(player.final_average),
      rating_count:
        player.rating_count === null
          ? null
          : Number(player.rating_count),
    })),
  };
}

export async function savePlayerMatchRating({
  matchId,
  playerId,
  rating,
}: {
  matchId: number;
  playerId: number;
  rating: number;
}): Promise<string> {
  const roundedRating = Math.round(rating * 10) / 10;

  const { data, error } = await supabase.rpc(
    "upsert_player_match_rating",
    {
      target_match_id: matchId,
      target_player_id: playerId,
      target_rating: roundedRating,
    },
  );

  if (error) {
    throw new Error(`Cijfer opslaan mislukt: ${error.message}`);
  }

  if (typeof data !== "string") {
    throw new Error("Het opgeslagen cijfer gaf geen geldig ID terug.");
  }

  return data;
}
