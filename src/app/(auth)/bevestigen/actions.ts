"use server";

import { redirect } from "next/navigation";
import { formValue, type FormState } from "@/lib/forms";
import { clientIp, consumeRateLimits } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { confirmSchema } from "@/lib/validation/auth";

const INVALID_LINK =
  "Deze link is ongeldig, al gebruikt of verlopen. Vraag een administrator om een nieuwe link.";

/**
 * Verifies a one-time invite/recovery token. Only on POST (button click):
 * link previews and mail scanners that GET the URL cannot burn the token.
 */
export async function confirmLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = confirmSchema.safeParse({
    tokenHash: formValue(formData, "token_hash"),
    type: formValue(formData, "type"),
  });
  if (!parsed.success) return { status: "error", message: INVALID_LINK };

  const allowed = await consumeRateLimits([
    { scope: "confirm:ip", value: await clientIp(), max: 20, windowSeconds: 15 * 60 },
  ]);
  if (!allowed) {
    return { status: "error", message: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: parsed.data.tokenHash,
    type: parsed.data.type,
  });
  if (error) return { status: "error", message: INVALID_LINK };

  redirect("/wachtwoord-instellen");
}
