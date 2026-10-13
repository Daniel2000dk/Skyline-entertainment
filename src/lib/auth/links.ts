import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthLinkResult =
  { ok: true; url: string } | { ok: false; reason: "exists" | "not_found" | "failed" };

/**
 * Creates a one-time invite or password-reset link without sending email
 * (free, no SMTP needed). The admin shares it privately. The token is only
 * consumed when the recipient presses "Doorgaan" on /bevestigen.
 * Callers must have verified that the current user is an admin.
 */
export async function generateAuthLink(
  type: "invite" | "recovery",
  email: string,
): Promise<AuthLinkResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type, email });

  if (error || !data.properties?.hashed_token) {
    if (error?.code === "email_exists") return { ok: false, reason: "exists" };
    if (error?.code === "user_not_found") return { ok: false, reason: "not_found" };
    return { ok: false, reason: "failed" };
  }

  const url = new URL("/bevestigen", siteUrl());
  url.searchParams.set("token_hash", data.properties.hashed_token);
  url.searchParams.set("type", type);
  return { ok: true, url: url.toString() };
}
