import type { ReactNode } from "react";

/**
 * Native POST (no client-side navigation) so logging out always ends with a
 * full page load that clears all internal content from the browser.
 */
export function LogoutForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form method="post" action="/uitloggen" className={className}>
      {children}
    </form>
  );
}
