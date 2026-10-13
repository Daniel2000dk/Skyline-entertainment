export const INTERNAL_HOME = "/intern";

/**
 * Only allow redirects to internal pages on this site. Rejects absolute URLs,
 * protocol-relative URLs (//evil.example), backslash tricks and anything
 * outside /intern, so a crafted ?next= cannot become an open redirect.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 200) return INTERNAL_HOME;
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) {
    return INTERNAL_HOME;
  }
  if (
    value !== INTERNAL_HOME &&
    !value.startsWith(`${INTERNAL_HOME}/`) &&
    !value.startsWith(`${INTERNAL_HOME}?`)
  ) {
    return INTERNAL_HOME;
  }
  return value;
}
