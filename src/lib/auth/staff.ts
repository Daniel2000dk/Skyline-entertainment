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

export type AuthState =
  { kind: "anonymous" } | { kind: "mfa_required" } | { kind: "staff"; staff: CurrentStaff };

/**
 * Data Access Layer entry point. The JWT is verified (getClaims), MFA is
 * enforced for users who enabled it, and the profile is read through RLS, so
 * a deactivated or non-staff account never counts as staff.
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  // Authorization always happens per request, never in a prerender/prefetch
  // (token expiry checks also depend on the current time).
  await connection();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return { kind: "anonymous" };

  // Password-only session while a verified authenticator exists: the code is
  // still needed (the database enforces the same rule via RLS).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") return { kind: "mfa_required" };

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id, display_name, role")
    .eq("id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) return { kind: "anonymous" };
  return {
    kind: "staff",
    staff: { id: profile.id, displayName: profile.display_name, role: profile.role },
  };
});

export async function getCurrentStaff(): Promise<CurrentStaff | null> {
  const state = await getAuthState();
  return state.kind === "staff" ? state.staff : null;
}

export async function requireStaff(): Promise<CurrentStaff> {
  const state = await getAuthState();
  if (state.kind === "mfa_required") redirect("/mfa");
  if (state.kind !== "staff") redirect("/login");
  return state.staff;
}

export async function requireRole(allowed: readonly StaffRole[]): Promise<CurrentStaff> {
  const staff = await requireStaff();
  if (!hasRole(staff.role, allowed)) redirect("/intern/geen-toegang");
  return staff;
}
