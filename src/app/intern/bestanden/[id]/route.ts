import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/projects";

/**
 * Serves a staff file through our own origin after the session check, so the
 * browser never talks to Supabase and the CSP stays strict. Files are inert:
 * no sniffing, sandboxed, and only images are shown inline.
 */
export async function GET(_request: Request, { params }: RouteContext<"/intern/bestanden/[id]">) {
  await requireStaff();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: attachment } = await supabase
    .from("attachments")
    .select("storage_path, file_name, content_type")
    .eq("id", id)
    .maybeSingle();
  if (!attachment) notFound();

  const { data: file, error } = await supabase.storage
    .from("staff-files")
    .download(attachment.storage_path);
  if (error || !file) notFound();

  const inline = attachment.content_type.startsWith("image/");
  const encodedName = encodeURIComponent(attachment.file_name);
  return new Response(file, {
    headers: {
      "Content-Type": attachment.content_type,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
    },
  });
}
