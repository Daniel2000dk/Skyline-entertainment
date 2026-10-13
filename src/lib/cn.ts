/** Joins class names, skipping falsy values. Variants are designed not to conflict. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
