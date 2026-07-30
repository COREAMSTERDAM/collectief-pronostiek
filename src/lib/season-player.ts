import { supabase } from "@/src/lib/supabase";

export type SeasonPlayer = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
  active: boolean;
};

export type SeasonRankingRow = {
  match_id: number;
  player_id: number;
  points: number;
  rank: number;
};

export type SeasonStanding = SeasonPlayer & {
  points: number;
  firstPlaceVotes: number;
  secondPlaceVotes: number;
  thirdPlaceVotes: number;
  matchesWithVotes: number;
  totalVotes: number;
};

export async function getSeasonPlayers() {
  return supabase
    .from("players")
    .select(
      "id, name, shirt_number, position, photo_url, active",
    )
    .order("shirt_number", { ascending: true });
}

export async function getSeasonRankingRows() {
  return supabase
    .from("player_rankings")
    .select("match_id, player_id, points, rank");
}

export function buildSeasonStandings(
  players: SeasonPlayer[],
  rankingRows: SeasonRankingRow[],
): SeasonStanding[] {
  const totals = new Map<
    number,
    {
      points: number;
      firstPlaceVotes: number;
      secondPlaceVotes: number;
      thirdPlaceVotes: number;
      matchIds: Set<number>;
      totalVotes: number;
    }
  >();

  for (const row of rankingRows) {
    const current = totals.get(row.player_id) ?? {
      points: 0,
      firstPlaceVotes: 0,
      secondPlaceVotes: 0,
      thirdPlaceVotes: 0,
      matchIds: new Set<number>(),
      totalVotes: 0,
    };

    current.points += Number(row.points) || 0;
    current.totalVotes += 1;
    current.matchIds.add(row.match_id);

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
        matchesWithVotes: total?.matchIds.size ?? 0,
        totalVotes: total?.totalVotes ?? 0,
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

      if (b.thirdPlaceVotes !== a.thirdPlaceVotes) {
        return b.thirdPlaceVotes - a.thirdPlaceVotes;
      }

      return a.name.localeCompare(b.name, "nl");
    });
}
