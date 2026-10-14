"use server";

import { revalidateInternal } from "@/lib/revalidate";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { dbErrorMessage } from "@/lib/db-errors";
import { formValue, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import {
  checklistItemSchema,
  memberSchema,
  projectStatusSchema,
  runbookItemSchema,
  updateProjectSchema,
  uuidSchema,
} from "@/lib/validation/projects";

// Every action re-checks the session; the database (RLS + guards) decides
// whether this staff member may change this project. Nothing from the form
// beyond ids and values is trusted.

function idFrom(formData: FormData, key = "projectId"): string | null {
  const parsed = uuidSchema.safeParse(formValue(formData, key));
  return parsed.success ? parsed.data : null;
}

const INVALID: FormState = { status: "error", message: "Ongeldige invoer." };

export async function updateProjectDetails(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  if (!projectId) return INVALID;

  const keys = [
    "title",
    "eventTypeId",
    "description",
    "budget",
    "summary",
    "location",
    "startsAt",
    "endsAt",
    "capacity",
    "entryFee",
    "rules",
    "registrationMode",
  ] as const;
  const values = Object.fromEntries(keys.map((key) => [key, formValue(formData, key)]));
  const parsed = updateProjectSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_event_project", {
    p_project_id: projectId,
    p_title: d.title,
    p_event_type_id: d.eventTypeId as string,
    p_description: d.description as string,
    p_budget_gta: d.budget,
    p_summary: d.summary as string,
    p_location: d.location as string,
    p_starts_at: d.startsAt as string,
    p_ends_at: d.endsAt as string,
    p_capacity: d.capacity as number,
    p_entry_fee_gta: d.entryFee,
    p_rules: d.rules as string,
    p_registration_mode: d.registrationMode,
  });
  if (error) return { status: "error", message: dbErrorMessage(error), values };

  revalidateInternal();
  return { status: "success", message: "Wijzigingen opgeslagen." };
}

export async function changeProjectStatus(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  const status = projectStatusSchema.safeParse(formValue(formData, "status"));
  if (!projectId || !status.success) return INVALID;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: status.data })
    .eq("id", projectId)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  return { status: "success", message: "Status opgeslagen." };
}

export async function transferOwnership(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  const ownerId = idFrom(formData, "ownerId");
  if (!projectId || !ownerId) return INVALID;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ owner_id: ownerId })
    .eq("id", projectId)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  return { status: "success", message: "Eigenaar gewijzigd." };
}

export async function deleteProject(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  if (!projectId) return INVALID;

  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").delete().eq("id", projectId).select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  redirect("/intern/projecten");
}

// Members ------------------------------------------------------------------------

export async function addMember(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  const parsed = memberSchema.safeParse({
    staffId: formValue(formData, "staffId"),
    permission: formValue(formData, "permission"),
  });
  if (!projectId) return INVALID;
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    staff_id: parsed.data.staffId,
    permission: parsed.data.permission,
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "Deze medewerker is al lid van het project."
          : dbErrorMessage(error),
    };
  }

  revalidateInternal();
  return { status: "success", message: "Lid toegevoegd." };
}

export async function updateMember(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  const parsed = memberSchema.safeParse({
    staffId: formValue(formData, "staffId"),
    permission: formValue(formData, "permission"),
  });
  if (!projectId || !parsed.success) return INVALID;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .update({ permission: parsed.data.permission })
    .eq("project_id", projectId)
    .eq("staff_id", parsed.data.staffId)
    .select("staff_id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  return { status: "success", message: "Recht opgeslagen." };
}

export async function removeMember(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  const staffId = idFrom(formData, "staffId");
  if (!projectId || !staffId) return INVALID;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("staff_id", staffId)
    .select("staff_id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  return { status: "success" };
}

// Checklist -----------------------------------------------------------------------

export async function addChecklistItem(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  const taskId = formValue(formData, "taskId") ? idFrom(formData, "taskId") : null;
  const parsed = checklistItemSchema.safeParse({ title: formValue(formData, "title") });
  if (!projectId) return INVALID;
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").insert({
    project_id: projectId,
    task_id: taskId,
    title: parsed.data.title,
    position: Math.floor(Date.now() / 1000),
  });
  if (error) return { status: "error", message: dbErrorMessage(error) };

  revalidateInternal();
  return { status: "success" };
}

export async function toggleChecklistItem(formData: FormData): Promise<void> {
  await requireStaff();
  const itemId = idFrom(formData, "itemId");
  if (!itemId) return;
  const supabase = await createClient();
  await supabase
    .from("checklist_items")
    .update({ is_done: formValue(formData, "done") === "true" })
    .eq("id", itemId);
  revalidateInternal();
}

export async function deleteChecklistItem(formData: FormData): Promise<void> {
  await requireStaff();
  const itemId = idFrom(formData, "itemId");
  if (!itemId) return;
  const supabase = await createClient();
  await supabase.from("checklist_items").delete().eq("id", itemId);
  revalidateInternal();
}

// Runbook -------------------------------------------------------------------------

function runbookValues(formData: FormData) {
  return {
    title: formValue(formData, "title"),
    startsAt: formValue(formData, "startsAt"),
    details: formValue(formData, "details"),
    responsibleId: formValue(formData, "responsibleId"),
  };
}

export async function saveRunbookItem(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData);
  const itemId = formValue(formData, "itemId") ? idFrom(formData, "itemId") : null;
  const values = runbookValues(formData);
  const parsed = runbookItemSchema.safeParse(values);
  if (!projectId) return INVALID;
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const row = {
    title: parsed.data.title,
    starts_at: parsed.data.startsAt,
    details: parsed.data.details,
    responsible_id: parsed.data.responsibleId,
  };
  const supabase = await createClient();
  const { data, error } = itemId
    ? await supabase.from("runbook_items").update(row).eq("id", itemId).select("id")
    : await supabase
        .from("runbook_items")
        .insert({ ...row, project_id: projectId })
        .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error), values };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }), values };

  revalidateInternal();
  return { status: "success", message: itemId ? "Onderdeel opgeslagen." : "Onderdeel toegevoegd." };
}

export async function deleteRunbookItem(formData: FormData): Promise<void> {
  await requireStaff();
  const itemId = idFrom(formData, "itemId");
  if (!itemId) return;
  const supabase = await createClient();
  await supabase.from("runbook_items").delete().eq("id", itemId);
  revalidateInternal();
}

// History -------------------------------------------------------------------------

export async function revertRevision(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const revisionId = Number(formValue(formData, "revisionId"));
  if (!Number.isSafeInteger(revisionId) || revisionId <= 0) return INVALID;

  const supabase = await createClient();
  const { error } = await supabase.rpc("revert_content_revision", { p_revision_id: revisionId });
  if (error) return { status: "error", message: dbErrorMessage(error, "Terugzetten is mislukt.") };

  revalidateInternal();
  return { status: "success", message: "Teruggezet." };
}
