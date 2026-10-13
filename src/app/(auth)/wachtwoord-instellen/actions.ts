"use server";

import { redirect } from "next/navigation";
import { isRecentlyAuthenticated } from "@/lib/auth/recent-auth";
import { formValue, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, setPasswordSchema } from "@/lib/validation/auth";

/** A password may only be set shortly after a fresh login or a verified link. */
const PASSWORD_CHANGE_MAX_AGE_SECONDS = 15 * 60;

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = setPasswordSchema.safeParse({
    password: formValue(formData, "password"),
    confirm: formValue(formData, "confirm"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");
  if (!isRecentlyAuthenticated(data.claims, PASSWORD_CHANGE_MAX_AGE_SECONDS)) {
    return {
      status: "error",
      message:
        "Je sessie is te oud om je wachtwoord te wijzigen. Vraag een nieuwe herstellink aan.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message =
      error.code === "same_password"
        ? "Kies een ander wachtwoord dan je huidige."
        : error.code === "weak_password"
          ? "Dit wachtwoord is te zwak. Kies een langer wachtwoord met letters en cijfers."
          : "Wachtwoord opslaan is mislukt. Probeer het opnieuw.";
    return { status: "error", message };
  }

  redirect("/intern");
}
