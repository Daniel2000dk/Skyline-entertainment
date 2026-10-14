"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { dbErrorMessage } from "@/lib/db-errors";
import { formValue, type FormState } from "@/lib/forms";
import { revalidateInternal } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { taskSchema, taskStatusSchema, uuidSchema } from "@/lib/validation/projects";

function idFrom(formData: FormData, key: string): string | null {
  const parsed = uuidSchema.safeParse(formValue(formData, key));
  return parsed.success ? parsed.data : null;
}

function taskValues(formData: FormData) {
  return {
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    assigneeId: formValue(formData, "assigneeId"),
    dueAt: formValue(formData, "dueAt"),
    priority: formValue(formData, "priority"),
  };
}

export async function createTask(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = idFrom(formData, "projectId");
  const values = taskValues(formData);
  const parsed = taskSchema.safeParse(values);
  if (!projectId) return { status: "error", message: "Ongeldige invoer." };
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: parsed.data.title,
    description: parsed.data.description,
    assignee_id: parsed.data.assigneeId,
    due_at: parsed.data.dueAt,
    priority: parsed.data.priority,
  });
  if (error) return { status: "error", message: dbErrorMessage(error), values };

  revalidateInternal();
  return { status: "success", message: "Taak toegevoegd." };
}

export async function updateTask(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const taskId = idFrom(formData, "taskId");
  const values = taskValues(formData);
  const parsed = taskSchema.safeParse(values);
  if (!taskId) return { status: "error", message: "Ongeldige invoer." };
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      assignee_id: parsed.data.assigneeId,
      due_at: parsed.data.dueAt,
      priority: parsed.data.priority,
    })
    .eq("id", taskId)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error), values };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }), values };

  revalidateInternal();
  return { status: "success", message: "Taak opgeslagen." };
}

/** Kanban move; allowed for project editors and the assignee (enforced by RLS). */
export async function moveTask(formData: FormData): Promise<void> {
  await requireStaff();
  const taskId = idFrom(formData, "taskId");
  const status = taskStatusSchema.safeParse(formValue(formData, "status"));
  if (!taskId || !status.success) return;

  const supabase = await createClient();
  await supabase.from("tasks").update({ status: status.data }).eq("id", taskId);
  revalidateInternal();
}

export async function deleteTask(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const taskId = idFrom(formData, "taskId");
  const projectId = idFrom(formData, "projectId");
  if (!taskId || !projectId) return { status: "error", message: "Ongeldige invoer." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", taskId).select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  redirect(`/intern/projecten/${projectId}/taken`);
}
