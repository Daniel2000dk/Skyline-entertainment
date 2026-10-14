import { z } from "zod";
import { ROUTE_COLORS, type RouteColor } from "@/lib/map/coords";

const coordinate = z.number().min(0).max(1);

export const mapPointSchema = z.strictObject({
  x: coordinate,
  y: coordinate,
  checkpoint: z.boolean().optional(),
});

const routeName = z
  .string({ error: "Geef de route een naam." })
  .trim()
  .min(1, "Geef de route een naam.")
  .max(80, "Gebruik maximaal 80 tekens.");

const routeColor = z.enum(Object.keys(ROUTE_COLORS) as [RouteColor, ...RouteColor[]], {
  error: "Kies een kleur.",
});

export const newRouteSchema = z.object({
  projectId: z.uuid(),
  name: routeName,
  color: routeColor,
});

export const saveRouteSchema = z.object({
  routeId: z.uuid(),
  name: routeName,
  color: routeColor,
  isLoop: z.boolean(),
  points: z
    .array(mapPointSchema, { error: "Ongeldige punten." })
    .max(300, "Een route heeft maximaal 300 punten."),
});

export const newMarkerSchema = z.object({
  projectId: z.uuid(),
  label: z
    .string({ error: "Geef de marker een naam." })
    .trim()
    .min(1, "Geef de marker een naam.")
    .max(80, "Gebruik maximaal 80 tekens."),
  note: z
    .string()
    .trim()
    .max(1000, "Gebruik maximaal 1000 tekens.")
    .transform((value) => (value === "" ? null : value)),
  x: coordinate,
  y: coordinate,
});

export const idInputSchema = z.object({ id: z.uuid() });

/** Points as stored; anything malformed is dropped rather than drawn. */
export const storedPointsSchema = z.array(mapPointSchema).catch([]);
