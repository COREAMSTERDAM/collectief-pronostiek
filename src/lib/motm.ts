import { supabase } from "@/src/lib/supabase";

export type MotmMatch = {
  home_team: string;
  away_team: string;
  kickoff: string;
};

export type MotmPlayer = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
};

export type UserVoteRow = {
  player_id: number;
  rank: number;
};

export type RankingRow = {
  player_id: number;
  points: number;
  rank: number;
};

export type MotmStanding = MotmPlayer & {
  points: number;
  firstPlaceVotes: number;
  secondPlaceVotes: number;
  thirdPlaceVotes: number;
};

export async function getMotmMatch(matchId: number) {
  return supabase
    .from("matches")
    .select("home_team, away_team, kickoff")
    .eq("id", matchId)
    .maybeSingle();
}

export async function getActiveMotmPlayers() {
  return supabase
    .from("players")
    .select("id, name, shirt_number, position, photo_url")
    .eq("active", true)
    .order("shirt_number", { ascending: true });
}

export async function getUserMotmVote(
  matchId: number,
  userId: string,
) {
  return supabase
    .from("player_rankings")
    .select("player_id, rank")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .order("rank", { ascending: true });
}

export async function getMatchRankingRows(matchId: number) {
  return supabase
    .from("player_rankings")
    .select("player_id, points, rank")
    .eq("match_id", matchId);
}

export function buildMotmStandings(
  players: MotmPlayer[],
  rankingRows: RankingRow[],
): MotmStanding[] {
  const totals = new Map<
    number,
    {
      points: number;
      firstPlaceVotes: number;
      secondPlaceVotes: number;
      thirdPlaceVotes: number;
    }
  >();

  for (const row of rankingRows) {
    const current = totals.get(row.player_id) ?? {
      points: 0,
      firstPlaceVotes: 0,
      secondPlaceVotes: 0,
      thirdPlaceVotes: 0,
    };

    current.points += Number(row.points) || 0;

    if (row.rank === 1) {
      current.firstPlaceVotes += 1;
    }

    if (row.rank === 2) {
      current.secondPlaceVotes += 1;
    }

    if (row.rank === 3) {
      current.thirdPlaceVotes += 1;
    }

    totals.set(row.player_id, current);
  }

  return players
    .map((player) => {
      const total = totals.get(player.id);

      return {
        ...player,
        points: total?.points ?? 0,
        firstPlaceVotes: total?.firstPlaceVotes ?? 0,
        secondPlaceVotes: total?.secondPlaceVotes ?? 0,
        thirdPlaceVotes: total?.thirdPlaceVotes ?? 0,
      };
    })
    .filter((player) => player.points > 0)
    .sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }

      if (b.firstPlaceVotes !== a.firstPlaceVotes) {
        return b.firstPlaceVotes - a.firstPlaceVotes;
      }

      if (b.secondPlaceVotes !== a.secondPlaceVotes) {
        return b.secondPlaceVotes - a.secondPlaceVotes;
      }

      return a.name.localeCompare(b.name, "nl");
    });
}

export async function submitMotmVote(
  matchId: number,
  selectedPlayerIds: number[],
) {
  const [
    firstPlayerId,
    secondPlayerId,
    thirdPlayerId,
  ] = selectedPlayerIds;

  return supabase.rpc("submit_player_top3", {
    p_match_id: matchId,
    p_first_player_id: firstPlayerId,
    p_second_player_id: secondPlayerId,
    p_third_player_id: thirdPlayerId,
  });
}