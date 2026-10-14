import "server-only";
import { requireStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";

export type AttachmentView = {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
  isImage: boolean;
};

export async function listAttachments(owner: { projectId: string } | { ideaId: string }) {
  await requireStaff();
  const supabase = await createClient();
  let query = supabase
    .from("attachments")
    .select(
      "id, file_name, content_type, size_bytes, uploaded_by, created_at, uploader:staff_profiles!attachments_uploaded_by_fkey(display_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  query =
    "projectId" in owner
      ? query.eq("project_id", owner.projectId)
      : query.eq("idea_id", owner.ideaId);
  const { data, error } = await query;
  if (error) throw new Error("Kon bestanden niet laden");
  return data.map((row): AttachmentView => ({
    id: row.id,
    fileName: row.file_name,
    contentType: row.content_type,
    sizeBytes: row.size_bytes,
    uploadedById: row.uploaded_by,
    uploadedByName: row.uploader?.display_name ?? null,
    createdAt: row.created_at,
    isImage: row.content_type.startsWith("image/"),
  }));
}
