"use server";

import { siteUrl } from "@/lib/env";
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

  // The response is identical whether the account exists, the email was
  // sent or a limit was hit, so the form cannot be used to probe accounts.
  if (allowed) {
    const supabase = await createClient();
    // The email template links to {{ .RedirectTo }}, so links point at the
    // environment (preview/production) where the reset was requested.
    await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${siteUrl()}/bevestigen`,
    });
  }
  return { status: "success", message: SENT_MESSAGE };
}
