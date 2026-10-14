"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireStaff } from "@/lib/auth/staff";
import { dbErrorMessage } from "@/lib/db-errors";
import { formValue, type FormState } from "@/lib/forms";
import { revalidateInternal } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { uuidSchema } from "@/lib/validation/projects";

const ideaSchema = z.object({
  title: z
    .string({ error: "Geef je idee een naam." })
    .trim()
    .min(1, "Geef je idee een naam.")
    .max(120, "Gebruik maximaal 120 tekens."),
  description: z
    .string()
    .trim()
    .max(5000, "Gebruik maximaal 5000 tekens.")
    .transform((value) => (value === "" ? null : value)),
});

const DECISIONS = { discussing: "discussing", approve: "approved", reject: "rejected" } as const;

function ideaIdFrom(formData: FormData): string | null {
  const parsed = uuidSchema.safeParse(formValue(formData, "ideaId"));
  return parsed.success ? parsed.data : null;
}

export async function createIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = {
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
  };
  const parsed = ideaSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase.from("ideas").insert(parsed.data).select("id").single();
  if (error || !data) return { status: "error", message: dbErrorMessage(error), values };

  revalidateInternal();
  redirect(`/intern/ideeen/${data.id}`);
}

export async function updateIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const ideaId = ideaIdFrom(formData);
  const values = {
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
  };
  const parsed = ideaSchema.safeParse(values);
  if (!ideaId) return { status: "error", message: "Ongeldige invoer." };
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ideas")
    .update(parsed.data)
    .eq("id", ideaId)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error), values };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }), values };

  revalidateInternal();
  return { status: "success", message: "Idee opgeslagen." };
}

export async function decideIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(["admin", "organizer"]);
  const ideaId = ideaIdFrom(formData);
  const decision = formValue(formData, "decision") as keyof typeof DECISIONS;
  if (!ideaId || !(decision in DECISIONS)) return { status: "error", message: "Ongeldige invoer." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ideas")
    .update({ status: DECISIONS[decision] })
    .eq("id", ideaId)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  return { status: "success" };
}

export async function toggleVote(formData: FormData): Promise<void> {
  const staff = await requireStaff();
  const ideaId = ideaIdFrom(formData);
  if (!ideaId) return;
  const supabase = await createClient();
  if (formValue(formData, "voted") === "true") {
    await supabase.from("idea_votes").delete().eq("idea_id", ideaId).eq("staff_id", staff.id);
  } else {
    await supabase.from("idea_votes").insert({ idea_id: ideaId });
  }
  revalidateInternal();
}

export async function convertIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireRole(["admin", "organizer"]);
  const ideaId = ideaIdFrom(formData);
  const eventType = formValue(formData, "eventTypeId");
  const eventTypeId = eventType ? uuidSchema.safeParse(eventType) : null;
  if (!ideaId || (eventTypeId && !eventTypeId.success))
    return { status: "error", message: "Ongeldige invoer." };

  const supabase = await createClient();
  const { data: projectId, error } = await supabase.rpc("convert_idea_to_project", {
    p_idea_id: ideaId,
    p_event_type_id: eventTypeId?.success ? eventTypeId.data : undefined,
  });
  if (error || !projectId) {
    return {
      status: "error",
      message:
        error?.code === "22023"
          ? "Alleen goedgekeurde ideeën kunnen een project worden."
          : dbErrorMessage(error, "Omzetten is mislukt."),
    };
  }

  revalidateInternal();
  redirect(`/intern/projecten/${projectId}`);
}

export async function deleteIdea(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const ideaId = ideaIdFrom(formData);
  if (!ideaId) return { status: "error", message: "Ongeldige invoer." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("ideas").delete().eq("id", ideaId).select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  redirect("/intern/ideeen");
}
