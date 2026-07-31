import { supabase } from "@/src/lib/supabase";

export type CoachMatchOverview = {
  match_id: number;
  home_team: string;
  away_team: string;
  kickoff: string;
  deadline: string;
  is_open: boolean;
  has_lineup: boolean;
  is_complete: boolean;
  lineup_id: string | null;
  updated_at: string | null;
};

type CoachMatchOverviewRow = {
  match_id: number | string;
  home_team: string;
  away_team: string;
  kickoff: string;
  deadline: string;
  is_open: boolean;
  has_lineup: boolean;
  is_complete: boolean;
  lineup_id: string | null;
  updated_at: string | null;
};

export async function getCoachMatchOverview(
  teamId: number,
): Promise<CoachMatchOverview[]> {
  const { data, error } = await supabase.rpc(
    "get_coach_match_overview",
    {
      target_team_id: teamId,
    },
  );

  if (error) {
    throw new Error(
      `Wedstrijdenoverzicht ophalen mislukt: ${error.message}`,
    );
  }

  const rows = (data ?? []) as unknown as CoachMatchOverviewRow[];

  return rows.map((row) => ({
    ...row,
    match_id: Number(row.match_id),
    is_open: Boolean(row.is_open),
    has_lineup: Boolean(row.has_lineup),
    is_complete: Boolean(row.is_complete),
  }));
}

export function getCoachMatchStatus(
  match: CoachMatchOverview,
  now = Date.now(),
) {
  const deadline = new Date(match.deadline).getTime();
  const millisecondsRemaining = deadline - now;
  const hoursRemaining = millisecondsRemaining / (60 * 60 * 1000);

  if (!match.is_open || millisecondsRemaining <= 0) {
    return {
      key: "closed" as const,
      label: "Gesloten",
      description: "De deadline is verstreken.",
    };
  }

  if (hoursRemaining <= 6) {
    return {
      key: "closing-soon" as const,
      label: "Sluit binnenkort",
      description: "Minder dan 6 uur resterend.",
    };
  }

  return {
    key: "open" as const,
    label: "Open",
    description: "Je kunt je basiself nog aanpassen.",
  };
}
