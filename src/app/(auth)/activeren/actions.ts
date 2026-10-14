"use server";

import { redirect } from "next/navigation";
import { codeHash, tokenHash } from "@/lib/auth/activation";
import { formValue, type FormState } from "@/lib/forms";
import { clientIp, consumeRateLimits } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { activationSchema, fieldErrors } from "@/lib/validation/auth";

const INVALID =
  "De link of code klopt niet, is al gebruikt of verlopen. Vraag een administrator om een nieuwe activatielink.";

/**
 * Sets the password with an activation link + code. The link alone is not
 * enough: the database only accepts the matching code and burns the link
 * after five wrong codes.
 */
export async function activateAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  // Only the code is kept after an error; passwords are never sent back.
  const values = { code: formValue(formData, "code").slice(0, 12) };
  const parsed = activationSchema.safeParse({
    token: formValue(formData, "token"),
    code: values.code,
    password: formValue(formData, "password"),
    confirm: formValue(formData, "confirm"),
  });
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    if (errors.token) return { status: "error", message: INVALID, values };
    return { status: "error", fieldErrors: errors, values };
  }

  const allowed = await consumeRateLimits([
    { scope: "activate:ip", value: await clientIp(), max: 20, windowSeconds: 15 * 60 },
  ]);
  if (!allowed) {
    return {
      status: "error",
      message: "Te veel pogingen. Probeer het over een kwartier opnieuw.",
      values,
    };
  }

  const { token, code, password } = parsed.data;
  const admin = createAdminClient();
  const { data: staffId } = await admin.rpc("redeem_staff_activation", {
    p_token_hash: tokenHash(token),
    p_code_hash: codeHash(token, code),
  });
  if (!staffId) return { status: "error", message: INVALID, values };

  const { data: updated, error } = await admin.auth.admin.updateUserById(staffId, { password });
  const email = updated?.user?.email;
  if (error || !email) {
    return {
      status: "error",
      message:
        "Wachtwoord instellen is mislukt. Vraag een administrator om een nieuwe activatielink.",
    };
  }

  // Log straight in; with 2FA enabled the code is still required (/mfa).
  const supabase = await createClient();
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) redirect("/login");
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/mfa");
  redirect("/intern");
}
