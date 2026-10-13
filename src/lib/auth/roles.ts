import type { Database } from "@/lib/supabase/database.types";

export type StaffRole = Database["public"]["Enums"]["staff_role"];

export const STAFF_ROLES = [
  "admin",
  "organizer",
  "team_member",
] as const satisfies readonly StaffRole[];

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrator",
  organizer: "Event Manager",
  team_member: "Medewerker",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  admin: "Volledige toegang, inclusief medewerkers en rechten.",
  organizer: "Organiseert projecten en evenementen en beheert taken en deelnemers.",
  team_member: "Bekijkt projecten, geeft feedback, plaatst suggesties en voert taken uit.",
};

export function hasRole(role: StaffRole, allowed: readonly StaffRole[]): boolean {
  return allowed.includes(role);
}
