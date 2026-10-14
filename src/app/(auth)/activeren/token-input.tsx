"use client";

import { useSearchParams } from "next/navigation";

/** Carries the link token (?t=) into the form; checked server-side only. */
export function TokenInput() {
  const searchParams = useSearchParams();
  return <input type="hidden" name="token" value={searchParams.get("t") ?? ""} />;
}
