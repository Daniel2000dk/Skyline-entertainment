"use server";

import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/auth/staff";
import { dbErrorMessage } from "@/lib/db-errors";
import { cleanFileName, detectFileType, MAX_FILE_BYTES } from "@/lib/files";
import { formValue, type FormState } from "@/lib/forms";
import { revalidateInternal } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/validation/projects";

const BUCKET = "staff-files";

/**
 * Uploads a file for a project or idea. Storage policies and the attachments
 * RLS both check the uploader's rights; the type comes from the content.
 */
export async function uploadAttachment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = uuidSchema.safeParse(formValue(formData, "projectId"));
  const ideaId = uuidSchema.safeParse(formValue(formData, "ideaId"));
  if (projectId.success === ideaId.success)
    return { status: "error", message: "Ongeldige invoer." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", fieldErrors: { file: "Kies een bestand." } };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { status: "error", fieldErrors: { file: "Het bestand is groter dan 4 MB." } };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectFileType(bytes);
  if (!type) {
    return {
      status: "error",
      fieldErrors: {
        file: "Alleen afbeeldingen (PNG, JPG, WebP, GIF) en PDF-bestanden zijn toegestaan.",
      },
    };
  }

  const folder = projectId.success ? `projects/${projectId.data}` : `ideas/${ideaId.data}`;
  const path = `${folder}/${randomUUID()}.${type.extension}`;
  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: type.contentType, upsert: false });
  if (uploadError) {
    return { status: "error", message: "Je hebt geen rechten om hier bestanden toe te voegen." };
  }

  const { error } = await supabase.from("attachments").insert({
    project_id: projectId.success ? projectId.data : null,
    idea_id: ideaId.success ? ideaId.data : null,
    storage_path: path,
    file_name: cleanFileName(file.name),
    content_type: type.contentType,
    size_bytes: bytes.byteLength,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { status: "error", message: dbErrorMessage(error, "Opslaan is mislukt.") };
  }

  revalidateInternal();
  return { status: "success", message: "Bestand toegevoegd." };
}

export async function deleteAttachment(formData: FormData): Promise<void> {
  await requireStaff();
  const attachmentId = uuidSchema.safeParse(formValue(formData, "attachmentId"));
  if (!attachmentId.success) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId.data)
    .select("storage_path");
  const path = data?.[0]?.storage_path;
  if (path) await supabase.storage.from(BUCKET).remove([path]);
  revalidateInternal();
}
