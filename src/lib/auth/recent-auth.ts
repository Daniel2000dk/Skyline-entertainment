type AmrEntry = { method?: string; timestamp?: number };

/**
 * True when the session was established (password, invite or recovery link)
 * within the last `maxAgeSeconds`. Used to require a fresh login before
 * sensitive account changes such as setting a password. Token refreshes do
 * not count: they keep the original authentication timestamps.
 */
export function isRecentlyAuthenticated(
  claims: { amr?: unknown } | null | undefined,
  maxAgeSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!claims || !Array.isArray(claims.amr)) return false;
  const latest = Math.max(
    0,
    ...(claims.amr as AmrEntry[]).map((entry) =>
      typeof entry?.timestamp === "number" ? entry.timestamp : 0,
    ),
  );
  return latest > 0 && nowSeconds - latest <= maxAgeSeconds;
}
