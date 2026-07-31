import { supabase } from "@/src/lib/supabase";

export type Formation = {
  id: number;
  name: string;
  description: string | null;
  player_count: number;
};

export type FormationPosition = {
  id: number;
  formation_id: number;
  position_code: string;
  position_label: string;
  position_group: "goalkeeper" | "defender" | "midfielder" | "forward";
  x_percent: number;
  y_percent: number;
  sort_order: number;
};

export type CoachPlayer = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
};

type FormationRow = {
  id: number;
  name: string;
  description: string | null;
  player_count: number;
};

type FormationPositionRow = {
  id: number;
  formation_id: number;
  position_code: string;
  position_label: string;
  position_group: FormationPosition["position_group"];
  x_percent: number | string;
  y_percent: number | string;
  sort_order: number;
};

type CoachPlayerRow = {
  id: number;
  name: string;
  shirt_number: number | null;
  position: string | null;
  photo_url: string | null;
};

export async function getActiveFormations(): Promise<Formation[]> {
  const { data, error } = await supabase
    .from("formations")
    .select("id, name, description, player_count")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Formaties ophalen mislukt: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as FormationRow[];

  return rows.map((formation) => ({
    ...formation,
    player_count: Number(formation.player_count),
  }));
}

export async function getFormationPositions(
  formationId: number,
): Promise<FormationPosition[]> {
  const { data, error } = await supabase
    .from("formation_positions")
    .select(
      "id, formation_id, position_code, position_label, position_group, x_percent, y_percent, sort_order",
    )
    .eq("formation_id", formationId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Formatieposities ophalen mislukt: ${error.message}`);
  }

  const rows = (data ?? []) as unknown as FormationPositionRow[];

  return rows.map((position) => ({
    ...position,
    x_percent: Number(position.x_percent),
    y_percent: Number(position.y_percent),
    sort_order: Number(position.sort_order),
  }));
}

export async function getActiveCoachPlayers(): Promise<CoachPlayer[]> {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, shirt_number, position, photo_url")
    .eq("active", true)
    .order("shirt_number", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Spelers ophalen mislukt: ${error.message}`);
  }

  return (data ?? []) as unknown as CoachPlayerRow[];
}
