import { revalidatePath } from "next/cache";

/**
 * Call after an internal mutation. Internal pages render per request anyway;
 * this also drops stale copies the browser's router cache kept of other
 * internal pages (e.g. another project tab), so every view shows fresh data.
 */
export function revalidateInternal() {
  revalidatePath("/intern", "layout");
}
