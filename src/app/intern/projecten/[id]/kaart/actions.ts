"use server";

import type { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { dbErrorMessage } from "@/lib/db-errors";
import { revalidateInternal } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import {
  idInputSchema,
  newMarkerSchema,
  newRouteSchema,
  saveRouteSchema,
} from "@/lib/validation/map";

// Called directly from the map editor. Every action re-checks the session and
// validates the input; RLS decides whether this staff member may edit the map
// of this project (owner, editors and admins only).

export type MapActionResult = { ok: true; id?: string } | { ok: false; message: string };

const DENIED: MapActionResult = {
  ok: false,
  message: "Je hebt geen rechten om de kaart van dit project te wijzigen.",
};

function invalid(error: z.ZodError): MapActionResult {
  return { ok: false, message: error.issues[0]?.message ?? "Ongeldige invoer." };
}

function done(data: Array<{ id: string }> | null, error: { code?: string } | null) {
  if (error) return { ok: false, message: dbErrorMessage(error) } satisfies MapActionResult;
  if (!data?.length) return DENIED;
  revalidateInternal();
  return { ok: true, id: data[0]!.id } satisfies MapActionResult;
}

export async function createRoute(input: unknown): Promise<MapActionResult> {
  await requireStaff();
  const parsed = newRouteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_routes")
    .insert({ project_id: parsed.data.projectId, name: parsed.data.name, color: parsed.data.color })
    .select("id");
  return done(data, error);
}

export async function saveRoute(input: unknown): Promise<MapActionResult> {
  await requireStaff();
  const parsed = saveRouteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { routeId, name, color, isLoop, points } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_routes")
    .update({ name, color, is_loop: isLoop, points })
    .eq("id", routeId)
    .select("id");
  return done(data, error);
}

export async function deleteRoute(input: unknown): Promise<MapActionResult> {
  await requireStaff();
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_routes")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");
  return done(data, error);
}

export async function createMarker(input: unknown): Promise<MapActionResult> {
  await requireStaff();
  const parsed = newMarkerSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { projectId, label, note, x, y } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_markers")
    .insert({ project_id: projectId, label, note, x, y })
    .select("id");
  return done(data, error);
}

export async function deleteMarker(input: unknown): Promise<MapActionResult> {
  await requireStaff();
  const parsed = idInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("map_markers")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");
  return done(data, error);
}
