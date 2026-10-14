import { z } from "zod";
import { STAFF_ROLES } from "@/lib/auth/roles";

// Same rule as the database check on staff_profiles.username.
export const usernameSchema = z
  .string({ error: "Vul een gebruikersnaam in." })
  .trim()
  .toLowerCase()
  .min(3, "Gebruik minimaal 3 tekens.")
  .max(30, "Gebruik maximaal 30 tekens.")
  .regex(
    /^[a-z0-9][a-z0-9._-]*$/,
    "Gebruik alleen letters, cijfers, punt, streepje of underscore (begin met een letter of cijfer).",
  );

// Matches the Supabase Auth policy (min 12, letters and digits). bcrypt only
// uses the first 72 bytes, so longer passwords are refused instead of
// silently truncated.
export const newPasswordSchema = z
  .string({ error: "Kies een wachtwoord." })
  .min(12, "Gebruik minimaal 12 tekens.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Gebruik maximaal 72 tekens.")
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), "Gebruik letters én cijfers.");

export const loginSchema = z.object({
  username: z
    .string({ error: "Vul je gebruikersnaam in." })
    .trim()
    .toLowerCase()
    .min(1, "Vul je gebruikersnaam in.")
    .max(30, "Gebruikersnaam of wachtwoord klopt niet."),
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
  username: usernameSchema,
  displayName: displayNameSchema,
  role: roleSchema,
});

/** Activation link token (base64url, 32 random bytes) and the separate code. */
export const activationSchema = z
  .object({
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    code: z
      .string({ error: "Vul de activatiecode in." })
      .transform((value) => value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
      .pipe(z.string().length(8, "Vul de activatiecode van 8 tekens in.")),
    password: newPasswordSchema,
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "De wachtwoorden komen niet overeen.",
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
