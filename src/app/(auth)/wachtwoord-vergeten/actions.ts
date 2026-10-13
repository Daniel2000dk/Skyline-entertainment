"use server";

import { formValue, type FormState } from "@/lib/forms";
import { clientIp, consumeRateLimits } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation/auth";

const SENT_MESSAGE =
  "Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met een herstellink.";

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = formValue(formData, "email");
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: { email: parsed.error.issues[0]?.message ?? "Vul een geldig e-mailadres in." },
      values: { email },
    };
  }

  const allowed = await consumeRateLimits([
    { scope: "reset:ip", value: await clientIp(), max: 10, windowSeconds: 60 * 60 },
    { scope: "reset:account", value: parsed.data, max: 3, windowSeconds: 60 * 60 },
  ]);

  // The answer never reveals whether an account exists or was throttled
  // per account; only the IP limit is reported, which says nothing about it.
  if (allowed) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data);
  }
  return { status: "success", message: SENT_MESSAGE };
}
