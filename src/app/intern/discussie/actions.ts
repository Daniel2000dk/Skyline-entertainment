"use server";

import { requireStaff } from "@/lib/auth/staff";
import { dbErrorMessage } from "@/lib/db-errors";
import { formValue, type FormState } from "@/lib/forms";
import { revalidateInternal } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { commentSchema, suggestionSchema } from "@/lib/validation/discussions";
import { uuidSchema } from "@/lib/validation/projects";

function optionalId(formData: FormData, key: string): string | null | "invalid" {
  const raw = formValue(formData, key);
  if (!raw) return null;
  const parsed = uuidSchema.safeParse(raw);
  return parsed.success ? parsed.data : "invalid";
}

const INVALID: FormState = { status: "error", message: "Ongeldige invoer." };

/** New thread on a subject, or a reply (parentId); the database files replies under the thread. */
export async function addComment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const ids = {
    project_id: optionalId(formData, "projectId"),
    task_id: optionalId(formData, "taskId"),
    suggestion_id: optionalId(formData, "suggestionId"),
    idea_id: optionalId(formData, "ideaId"),
    parent_id: optionalId(formData, "parentId"),
  };
  if (Object.values(ids).includes("invalid")) return INVALID;
  const subjects = [ids.project_id, ids.task_id, ids.suggestion_id, ids.idea_id].filter(Boolean);
  if (!ids.parent_id && subjects.length !== 1) return INVALID;

  const parsed = commentSchema.safeParse({ body: formValue(formData, "body") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({
    ...(ids.parent_id
      ? { parent_id: ids.parent_id }
      : {
          project_id: ids.project_id as string | null,
          task_id: ids.task_id as string | null,
          suggestion_id: ids.suggestion_id as string | null,
          idea_id: ids.idea_id as string | null,
        }),
    body: parsed.data.body,
  });
  if (error) return { status: "error", message: dbErrorMessage(error, "Plaatsen is mislukt.") };

  revalidateInternal();
  return { status: "success" };
}

export async function editComment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const commentId = optionalId(formData, "commentId");
  if (!commentId || commentId === "invalid") return INVALID;
  const parsed = commentSchema.safeParse({ body: formValue(formData, "body") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .update({ body: parsed.data.body })
    .eq("id", commentId)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  return { status: "success" };
}

export async function removeComment(formData: FormData): Promise<void> {
  await requireStaff();
  const commentId = optionalId(formData, "commentId");
  if (!commentId || commentId === "invalid") return;
  const supabase = await createClient();
  await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", commentId);
  revalidateInternal();
}

export async function createSuggestion(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = optionalId(formData, "projectId");
  if (!projectId || projectId === "invalid") return INVALID;
  const values = {
    field: formValue(formData, "field"),
    proposedValue: formValue(formData, "proposedValue"),
    message: formValue(formData, "message"),
  };
  const parsed = suggestionSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("suggestions").insert({
    project_id: projectId,
    field: parsed.data.field,
    proposed_value: parsed.data.proposedValue,
    message: parsed.data.message,
  });
  if (error)
    return { status: "error", message: dbErrorMessage(error, "Indienen is mislukt."), values };

  revalidateInternal();
  return { status: "success", message: "Suggestie ingediend. De eigenaar beslist erover." };
}

export async function decideSuggestion(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const suggestionId = optionalId(formData, "suggestionId");
  const decision = formValue(formData, "decision");
  if (!suggestionId || suggestionId === "invalid" || !["accept", "reject"].includes(decision)) {
    return INVALID;
  }
  const note = formValue(formData, "note").trim().slice(0, 1000);

  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_suggestion", {
    p_suggestion_id: suggestionId,
    p_accept: decision === "accept",
    p_note: note,
  });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "22023"
          ? "Deze suggestie is al afgehandeld."
          : dbErrorMessage(error, "Beslissen is mislukt."),
    };
  }

  revalidateInternal();
  return {
    status: "success",
    message:
      decision === "accept" ? "Suggestie geaccepteerd en toegepast." : "Suggestie afgewezen.",
  };
}

export async function withdrawSuggestion(formData: FormData): Promise<void> {
  await requireStaff();
  const suggestionId = optionalId(formData, "suggestionId");
  if (!suggestionId || suggestionId === "invalid") return;
  const supabase = await createClient();
  await supabase.from("suggestions").update({ status: "withdrawn" }).eq("id", suggestionId);
  revalidateInternal();
}
