import "server-only";
import { requireStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { storedPointsSchema } from "@/lib/validation/map";
import { ROUTE_COLORS, type MapPoint, type RouteColor } from "./coords";

/** Object name of the map image in the private "maps" bucket. */
export const MAP_OBJECT = "gta-v-kaart";

export type MapRoute = {
  id: string;
  name: string;
  color: RouteColor;
  points: MapPoint[];
  isLoop: boolean;
};

export type MapMarker = { id: string; label: string; note: string | null; x: number; y: number };

export async function listRoutes(projectId: string): Promise<MapRoute[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_routes")
    .select("id, name, color, points, is_loop")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw new Error("Kon de routes niet laden");
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    color: (row.color in ROUTE_COLORS ? row.color : "gold") as RouteColor,
    points: storedPointsSchema.parse(row.points),
    isLoop: row.is_loop,
  }));
}

export async function listMarkers(projectId: string): Promise<MapMarker[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_markers")
    .select("id, label, note, x, y")
    .eq("project_id", projectId)
    .order("created_at");
  if (error) throw new Error("Kon de markers niet laden");
  return data;
}

/** URL of the map image (versioned so browsers refetch after a replacement), or null. */
export async function getMapImageUrl(): Promise<string | null> {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.storage.from("maps").list("", { search: MAP_OBJECT, limit: 10 });
  const file = data?.find((entry) => entry.name === MAP_OBJECT);
  if (!file) return null;
  const version = new Date(file.updated_at ?? file.created_at ?? 0).getTime();
  return `/intern/kaart/afbeelding?v=${version}`;
}
