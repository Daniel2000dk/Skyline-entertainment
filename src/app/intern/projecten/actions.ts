"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/staff";
import { dbErrorMessage } from "@/lib/db-errors";
import { formValue, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { createProjectSchema } from "@/lib/validation/projects";

export async function createProject(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(["admin", "organizer"]);
  const values = {
    title: formValue(formData, "title"),
    eventTypeId: formValue(formData, "eventTypeId"),
    startsAt: formValue(formData, "startsAt"),
    description: formValue(formData, "description"),
  };
  const parsed = createProjectSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data: projectId, error } = await supabase.rpc("create_event_project", {
    p_title: parsed.data.title,
    p_event_type_id: parsed.data.eventTypeId ?? undefined,
    p_starts_at: parsed.data.startsAt ?? undefined,
    p_description: parsed.data.description ?? undefined,
  });
  if (error || !projectId) {
    return { status: "error", message: dbErrorMessage(error, "Aanmaken is mislukt."), values };
  }

  redirect(`/intern/projecten/${projectId}`);
}
