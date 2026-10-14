"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { formValue, type FormState } from "@/lib/forms";
import { clientIp, consumeRateLimits } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, loginSchema } from "@/lib/validation/auth";

const FIFTEEN_MINUTES = 15 * 60;
const WRONG = "Gebruikersnaam of wachtwoord klopt niet.";

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = formValue(formData, "username");
  const parsed = loginSchema.safeParse({ username, password: formValue(formData, "password") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: { username } };
  }

  // Per-IP is generous (shared networks); per-account stops slow brute force.
  const allowed = await consumeRateLimits([
    { scope: "login:ip", value: await clientIp(), max: 30, windowSeconds: FIFTEEN_MINUTES },
    {
      scope: "login:account",
      value: parsed.data.username,
      max: 10,
      windowSeconds: FIFTEEN_MINUTES,
    },
  ]);
  if (!allowed) {
    return {
      status: "error",
      message: "Te veel inlogpogingen. Probeer het over een kwartier opnieuw.",
      values: { username },
    };
  }

  // The Auth account behind a username has an internal email address that
  // staff never see; only the server (secret key) can look it up.
  const { data: email } = await createAdminClient().rpc("staff_login_email", {
    p_username: parsed.data.username,
  });
  // Same message for unknown username and wrong password (no account enumeration).
  if (!email) return { status: "error", message: WRONG, values: { username } };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return {
      status: "error",
      message:
        error?.status === 429
          ? "Te veel inlogpogingen. Probeer het over een kwartier opnieuw."
          : WRONG,
      values: { username },
    };
  }

  const next = safeNextPath(formValue(formData, "next"));

  // With MFA enabled the database grants nothing until the code is entered,
  // so the staff check happens after /mfa (via the DAL).
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
    redirect(`/mfa?next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from("staff_profiles")
    .select("id")
    .eq("id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Dit account heeft geen toegang tot het interne systeem.",
      values: { username },
    };
  }

  redirect(next);
}
