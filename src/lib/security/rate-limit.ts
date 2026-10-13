import "server-only";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { digest } from "./digest";

/**
 * Client IP as seen by Vercel's edge (which overwrites X-Forwarded-For, so it
 * cannot be spoofed there). A weak signal: shared by households, schools and
 * VPN users, so limits per IP must stay generous.
 */
export async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerList.get("x-real-ip") || "unknown";
}

type Limit = { scope: string; value: string; max: number; windowSeconds: number };

/**
 * Consumes one hit for every limit and returns false if any is exceeded.
 * Fails closed: if the limiter is unavailable the attempt is refused.
 */
export async function consumeRateLimits(limits: Limit[]): Promise<boolean> {
  const { RATE_LIMIT_SECRET } = serverEnv();
  const admin = createAdminClient();
  const results = await Promise.all(
    limits.map(({ scope, value, max, windowSeconds }) =>
      admin.rpc("consume_rate_limit", {
        limit_key: `${scope}:${digest(value, RATE_LIMIT_SECRET)}`,
        max_hits: max,
        window_seconds: windowSeconds,
      }),
    ),
  );
  return results.every(({ data, error }) => !error && data === true);
}
