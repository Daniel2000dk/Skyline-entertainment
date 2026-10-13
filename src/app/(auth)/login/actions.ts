"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { formValue, type FormState } from "@/lib/forms";
import { clientIp, consumeRateLimits } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, loginSchema } from "@/lib/validation/auth";

const FIFTEEN_MINUTES = 15 * 60;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = formValue(formData, "email");
  const parsed = loginSchema.safeParse({ email, password: formValue(formData, "password") });
  if (!parsed.success) {
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: { email } };
  }

  // Per-IP is generous (shared networks); per-account stops slow brute force.
  const allowed = await consumeRateLimits([
    { scope: "login:ip", value: await clientIp(), max: 30, windowSeconds: FIFTEEN_MINUTES },
    { scope: "login:account", value: parsed.data.email, max: 10, windowSeconds: FIFTEEN_MINUTES },
  ]);
  if (!allowed) {
    return {
      status: "error",
      message: "Te veel inlogpogingen. Probeer het over een kwartier opnieuw.",
      values: { email },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    // Same message for unknown email and wrong password (no account enumeration).
    return {
      status: "error",
      message:
        error?.status === 429
          ? "Te veel inlogpogingen. Probeer het over een kwartier opnieuw."
          : "E-mailadres of wachtwoord klopt niet.",
      values: { email },
    };
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
      values: { email },
    };
  }

  redirect(safeNextPath(formValue(formData, "next")));
}
