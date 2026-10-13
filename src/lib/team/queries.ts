import "server-only";
import { requireRole } from "@/lib/auth/staff";
import type { StaffRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TeamMember = {
  id: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
  email: string | null;
  hasSignedIn: boolean;
  hasMfa: boolean;
  createdAt: string;
};

/** Admin-only: staff with their login email and whether they ever signed in. */
export async function listTeam(): Promise<TeamMember[]> {
  await requireRole(["admin"]);

  const supabase = await createClient();
  const { data: profiles, error } = await supabase
    .from("staff_profiles")
    .select("id, display_name, role, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("display_name");
  if (error) throw new Error("Kon medewerkers niet laden");

  // Emails and sign-in state live in Auth, readable only with the secret key.
  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authById = new Map((users?.users ?? []).map((user) => [user.id, user]));
  const { data: mfaIds } = await supabase.rpc("staff_with_mfa");
  const withMfa = new Set(mfaIds ?? []);

  return profiles.map((profile) => {
    const user = authById.get(profile.id);
    return {
      id: profile.id,
      displayName: profile.display_name,
      role: profile.role,
      isActive: profile.is_active,
      email: user?.email ?? null,
      hasSignedIn: Boolean(user?.last_sign_in_at),
      hasMfa: withMfa.has(profile.id),
      createdAt: profile.created_at,
    };
  });
}
