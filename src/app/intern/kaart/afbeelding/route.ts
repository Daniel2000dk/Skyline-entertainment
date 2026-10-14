import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { MAP_OBJECT } from "@/lib/map/queries";
import { createClient } from "@/lib/supabase/server";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/**
 * The GTA V map image, for staff only. It is not ours to publish, so it stays
 * in private storage and is served through our own origin after the session
 * check (the browser never talks to Supabase). Cached privately; the page adds
 * a version parameter, so a replaced image is fetched again.
 */
export async function GET() {
  await requireStaff();
  const supabase = await createClient();
  const { data: file, error } = await supabase.storage.from("maps").download(MAP_OBJECT);
  if (error || !file || !IMAGE_TYPES.has(file.type)) notFound();

  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
