import { createHmac } from "node:crypto";

/**
 * Keyed digest so the database never stores raw IPs or emails. Truncated:
 * enough to separate buckets, useless for re-identification without the key.
 */
export function digest(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url").slice(0, 32);
}
