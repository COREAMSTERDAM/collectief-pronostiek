import {
  getCollectiveLineupDashboard,
  type CollectiveDashboard,
} from "@/src/lib/coach";

export async function getMatchCollectiveDashboard(
  teamId: number,
  matchId: number,
): Promise<CollectiveDashboard> {
  return getCollectiveLineupDashboard(
    teamId,
    `match-${matchId}`,
  );
}
