"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/staff";
import { localInputToIso } from "@/lib/datetime";
import { dbErrorMessage } from "@/lib/db-errors";
import { formValue, type FormState } from "@/lib/forms";
import { revalidateInternal } from "@/lib/revalidate";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/auth";
import { uuidSchema } from "@/lib/validation/projects";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Gebruik maximaal ${max} tekens.`)
    .transform((value) => (value === "" ? null : value));

const optionalUuid = z
  .string()
  .trim()
  .refine((value) => value === "" || uuidSchema.safeParse(value).success, "Ongeldige keuze.")
  .transform((value) => (value === "" ? null : value));

const activitySchema = z
  .object({
    title: z.string().trim().min(1, "Vul een titel in.").max(120, "Gebruik maximaal 120 tekens."),
    description: optionalText(2000),
    location: optionalText(120),
    startsAt: z
      .string()
      .refine((value) => localInputToIso(value) !== null, "Vul een geldige datum en tijd in.")
      .transform((value) => localInputToIso(value)!),
    endsAt: z
      .string()
      .refine(
        (value) => value === "" || localInputToIso(value) !== null,
        "Vul een geldige datum en tijd in.",
      )
      .transform((value) => localInputToIso(value)),
    responsibleId: optionalUuid,
  })
  .refine((data) => !data.endsAt || data.endsAt > data.startsAt, {
    path: ["endsAt"],
    message: "Het einde moet na de start liggen.",
  });

function activityValues(formData: FormData) {
  return {
    title: formValue(formData, "title"),
    description: formValue(formData, "description"),
    location: formValue(formData, "location"),
    startsAt: formValue(formData, "startsAt"),
    endsAt: formValue(formData, "endsAt"),
    responsibleId: formValue(formData, "responsibleId"),
  };
}

function toRow(data: z.infer<typeof activitySchema>) {
  return {
    title: data.title,
    description: data.description,
    location: data.location,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    responsible_id: data.responsibleId,
  };
}

export async function createActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const values = activityValues(formData);
  const parsed = activitySchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { error } = await supabase.from("team_activities").insert(toRow(parsed.data));
  if (error) return { status: "error", message: dbErrorMessage(error), values };

  revalidateInternal();
  return { status: "success", message: "Activiteit ingepland." };
}

export async function updateActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const activityId = uuidSchema.safeParse(formValue(formData, "activityId"));
  const values = activityValues(formData);
  const parsed = activitySchema.safeParse(values);
  if (!activityId.success) return { status: "error", message: "Ongeldige invoer." };
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_activities")
    .update(toRow(parsed.data))
    .eq("id", activityId.data)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error), values };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }), values };

  revalidateInternal();
  return { status: "success", message: "Activiteit opgeslagen." };
}

export async function deleteActivity(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const activityId = uuidSchema.safeParse(formValue(formData, "activityId"));
  if (!activityId.success) return { status: "error", message: "Ongeldige invoer." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("team_activities")
    .delete()
    .eq("id", activityId.data)
    .select("id");
  if (error) return { status: "error", message: dbErrorMessage(error) };
  if (!data.length) return { status: "error", message: dbErrorMessage({ code: "42501" }) };

  revalidateInternal();
  redirect("/intern/planning");
}

/** Moves an event from the calendar; the end time shifts along. */
export async function rescheduleEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const projectId = uuidSchema.safeParse(formValue(formData, "projectId"));
  const startsAt = localInputToIso(formValue(formData, "startsAt"));
  if (!projectId.success) return { status: "error", message: "Ongeldige invoer." };
  if (!startsAt) return { status: "error", message: "Vul een geldige datum en tijd in." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_event", {
    p_project_id: projectId.data,
    p_starts_at: startsAt,
  });
  if (error) return { status: "error", message: dbErrorMessage(error, "Verplaatsen is mislukt.") };

  revalidateInternal();
  return { status: "success", message: "Evenement verplaatst." };
}
