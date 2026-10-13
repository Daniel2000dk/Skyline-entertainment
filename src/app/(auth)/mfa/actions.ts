"use server";

import { redirect } from "next/navigation";
import { safeNextPath } from "@/lib/auth/redirect";
import { formValue, type FormState } from "@/lib/forms";
import { clientIp, consumeRateLimits } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { mfaCodeSchema } from "@/lib/validation/auth";

const FIFTEEN_MINUTES = 15 * 60;

/** Second login step: upgrades a password-only session to aal2 with a TOTP code. */
export async function verifyLoginCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = mfaCodeSchema.safeParse(formValue(formData, "code"));
  if (!code.success) {
    return { status: "error", fieldErrors: { code: code.error.issues[0]?.message ?? "" } };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const allowed = await consumeRateLimits([
    { scope: "mfa:ip", value: await clientIp(), max: 30, windowSeconds: FIFTEEN_MINUTES },
    { scope: "mfa:account", value: userId, max: 10, windowSeconds: FIFTEEN_MINUTES },
  ]);
  if (!allowed) {
    return { status: "error", message: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp[0];
  if (!factor) redirect("/intern");

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factor.id,
    code: code.data,
  });
  if (error) {
    return {
      status: "error",
      message: "Deze code klopt niet of is verlopen. Probeer de nieuwste.",
    };
  }

  redirect(safeNextPath(formValue(formData, "next")));
}
