import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Privileged client (secret key, bypasses RLS). Only for operations that have
 * no user-level equivalent: Auth admin calls and the rate limiter. Callers
 * must authorize the current user BEFORE using it.
 */
export function createAdminClient() {
  const env = serverEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
