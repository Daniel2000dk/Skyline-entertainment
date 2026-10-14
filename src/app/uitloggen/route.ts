import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Logout as a plain form POST answered with a 303 redirect: the browser does a
 * full page load, so no previously viewed internal page stays preserved
 * (hidden) in the client router or React Activity after signing out.
 */
export async function POST(request: NextRequest) {
  // Route handlers have no built-in CSRF check: only accept same-origin posts.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse("Ongeldige aanvraag", { status: 403 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });

  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.headers.set("Cache-Control", "no-store");
  // Ask the browser to drop anything cached for this site (pages, storage).
  response.headers.set("Clear-Site-Data", '"cache", "storage"');
  return response;
}
