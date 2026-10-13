import "server-only";
import { z } from "zod";

// All secrets are server-only (no NEXT_PUBLIC_ prefix): the browser never
// talks to Supabase directly, so no key ever ships in the client bundle.
const serverEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  RATE_LIMIT_SECRET: z.string().min(32, "RATE_LIMIT_SECRET must be at least 32 characters"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Validated lazily so builds do not need runtime secrets. */
export function serverEnv(): ServerEnv {
  if (!cached) {
    const result = serverEnvSchema.safeParse(process.env);
    if (!result.success) {
      const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
      throw new Error(`Invalid server environment: ${missing}`);
    }
    cached = result.data;
  }
  return cached;
}

/** Absolute origin used in links we hand out (invite and reset links). */
export function siteUrl(): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const previewHost = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
  if (previewHost) return `https://${previewHost}`;
  return "http://localhost:3000";
}
