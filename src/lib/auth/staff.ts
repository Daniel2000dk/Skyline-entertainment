import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasRole, type StaffRole } from "./roles";

export type CurrentStaff = {
  id: string;
  displayName: string;
  role: StaffRole;
};

/**
 * Data Access Layer entry point: the verified, active staff member for this
 * request, or null. The JWT is verified (getClaims) and the profile is read
 * through RLS, so a deactivated or non-staff account always yields null.
 */
export const getCurrentStaff = cache(async (): Promise<CurrentStaff | null> => {
  // Authorization always happens per request, never in a prerender/prefetch
  // (token expiry checks also depend on the current time).
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, display_name, role")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) return null;
  return { id: profile.id, displayName: profile.display_name, role: profile.role };
});

export async function requireStaff(): Promise<CurrentStaff> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/login");
  return staff;
}

export async function requireRole(allowed: readonly StaffRole[]): Promise<CurrentStaff> {
  const staff = await requireStaff();
  if (!hasRole(staff.role, allowed)) redirect("/intern/geen-toegang");
  return staff;
}
