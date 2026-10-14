"use server";

import { revalidateInternal } from "@/lib/revalidate";
import { z } from "zod";
import { isRecentlyAuthenticated } from "@/lib/auth/recent-auth";
import { requireStaff } from "@/lib/auth/staff";
import { formValue, type FormState } from "@/lib/forms";
import { clientIp, consumeRateLimits } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { mfaCodeSchema } from "@/lib/validation/auth";

export type EnrollState = FormState & { factorId?: string; qrCode?: string; secret?: string };

const SENSITIVE_ACTION_MAX_AGE_SECONDS = 15 * 60;

/** Step 1: create a (still unverified) TOTP factor and return its QR code. */
export async function startMfaEnrollment(): Promise<EnrollState> {
  await requireStaff();
  const supabase = await createClient();

  // Clean up abandoned attempts so the friendly name stays unique.
  const { data: factors } = await supabase.auth.mfa.listFactors();
  if (factors?.totp.length) {
    return { status: "error", message: "Tweestapsverificatie staat al aan." };
  }
  for (const factor of factors?.all ?? []) {
    if (factor.factor_type === "totp" && factor.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Skyline Entertainment",
    issuer: "Skyline Entertainment",
  });
  if (error || !data) {
    return { status: "error", message: "Instellen is mislukt. Probeer het opnieuw." };
  }
  return {
    status: "success",
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

/** Step 2: confirm the factor with a code from the app; upgrades the session to aal2. */
export async function confirmMfaEnrollment(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const staff = await requireStaff();
  const factorId = z.uuid().safeParse(formValue(formData, "factorId"));
  const code = mfaCodeSchema.safeParse(formValue(formData, "code"));
  if (!factorId.success) return { status: "error", message: "Begin opnieuw met instellen." };
  if (!code.success) {
    return { status: "error", fieldErrors: { code: code.error.issues[0]?.message ?? "" } };
  }

  const allowed = await consumeRateLimits([
    { scope: "mfa:ip", value: await clientIp(), max: 30, windowSeconds: 15 * 60 },
    { scope: "mfa:account", value: staff.id, max: 10, windowSeconds: 15 * 60 },
  ]);
  if (!allowed) {
    return { status: "error", message: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId: factorId.data,
    code: code.data,
  });
  if (error) {
    return {
      status: "error",
      message: "Deze code klopt niet of is verlopen. Probeer de nieuwste.",
    };
  }

  await supabase.rpc("log_security_event", {
    target_staff_id: staff.id,
    security_event: "mfa.enabled",
  });
  revalidateInternal();
  return { status: "success", message: "Tweestapsverificatie staat aan." };
}

/** Turning MFA off is sensitive: requires a session upgraded with a code in the last 15 minutes. */
export async function disableMfa(): Promise<FormState> {
  const staff = await requireStaff();
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!isRecentlyAuthenticated(claims?.claims, SENSITIVE_ACTION_MAX_AGE_SECONDS)) {
    return {
      status: "error",
      message: "Log opnieuw in (met code) en zet het daarna binnen 15 minuten uit.",
    };
  }

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) return { status: "error", message: "Uitzetten is mislukt. Probeer het opnieuw." };
  }

  await supabase.rpc("log_security_event", {
    target_staff_id: staff.id,
    security_event: "mfa.disabled",
  });
  revalidateInternal();
  return { status: "success", message: "Tweestapsverificatie staat uit." };
}
