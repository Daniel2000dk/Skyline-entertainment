"use client";

import { useSearchParams } from "next/navigation";

/** Carries ?next= into the login action; validated server-side (safeNextPath). */
export function NextPathInput() {
  const searchParams = useSearchParams();
  return <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />;
}
