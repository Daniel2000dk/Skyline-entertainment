import { z } from "zod";
import { STAFF_ROLES } from "@/lib/auth/roles";

export const emailSchema = z
  .string({ error: "Vul je e-mailadres in." })
  .trim()
  .toLowerCase()
  .max(254, "Dit e-mailadres is te lang.")
  .pipe(z.email("Vul een geldig e-mailadres in."));

// Matches the Supabase Auth policy (min 12, letters and digits). bcrypt only
// uses the first 72 bytes, so longer passwords are refused instead of
// silently truncated.
export const newPasswordSchema = z
  .string({ error: "Kies een wachtwoord." })
  .min(12, "Gebruik minimaal 12 tekens.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Gebruik maximaal 72 tekens.")
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), "Gebruik letters én cijfers.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vul je wachtwoord in.").max(200),
});

export const setPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "De wachtwoorden komen niet overeen.",
  });

export const displayNameSchema = z
  .string({ error: "Vul een naam in." })
  .trim()
  .min(1, "Vul een naam in.")
  .max(60, "Gebruik maximaal 60 tekens.");

export const roleSchema = z.enum(STAFF_ROLES, { error: "Kies een geldige rol." });

export const inviteSchema = z.object({
  email: emailSchema,
  displayName: displayNameSchema,
  role: roleSchema,
});

export const otpTypeSchema = z.enum(["invite", "recovery"]);

export const confirmSchema = z.object({
  tokenHash: z
    .string()
    .min(10)
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/),
  type: otpTypeSchema,
});

/** First error message per field, for showing next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    result[key] ??= issue.message;
  }
  return result;
}

export const mfaCodeSchema = z
  .string({ error: "Vul de code in." })
  .trim()
  .regex(/^\d{6}$/, "Vul de 6 cijfers uit je authenticator-app in.");
