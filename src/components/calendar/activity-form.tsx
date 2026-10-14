"use client";

import { useActionState } from "react";
import { createActivity, updateActivity } from "@/app/intern/planning/actions";
import { FormField, SelectField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActivityDetail } from "@/lib/calendar/queries";
import { isoToLocalInput } from "@/lib/datetime";
import { idleFormState, type FormState } from "@/lib/forms";
import type { StaffOption } from "@/lib/projects/queries";

export function ActivityForm({
  activity,
  staff,
  defaultStart,
  onSaved,
}: {
  activity?: ActivityDetail;
  staff: StaffOption[];
  defaultStart?: string;
  onSaved?: () => void;
}) {
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await (activity ? updateActivity : createActivity)(prev, formData);
    if (result.status === "success") onSaved?.();
    return result;
  }, idleFormState);
  const v = state.status === "error" ? state.values : undefined;
  const prefix = activity ? "activity-edit" : "activity-new";

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
      {activity && <input type="hidden" name="activityId" value={activity.id} />}
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <FormField
        id={`${prefix}-title`}
        name="title"
        label="Titel"
        required
        maxLength={120}
        defaultValue={v?.title ?? activity?.title}
        error={state.fieldErrors?.title}
      />
      <FormField
        id={`${prefix}-location`}
        name="location"
        label="Locatie"
        maxLength={120}
        defaultValue={v?.location ?? activity?.location ?? ""}
        error={state.fieldErrors?.location}
      />
      <FormField
        id={`${prefix}-start`}
        name="startsAt"
        label="Start"
        type="datetime-local"
        required
        defaultValue={v?.startsAt ?? (activity ? isoToLocalInput(activity.startsAt) : defaultStart)}
        error={state.fieldErrors?.startsAt}
      />
      <FormField
        id={`${prefix}-end`}
        name="endsAt"
        label="Einde (optioneel)"
        type="datetime-local"
        defaultValue={v?.endsAt ?? isoToLocalInput(activity?.endsAt)}
        error={state.fieldErrors?.endsAt}
      />
      <SelectField
        id={`${prefix}-responsible`}
        name="responsibleId"
        label="Verantwoordelijke"
        options={staff.map((person) => ({ value: person.id, label: person.displayName }))}
        emptyLabel="Niemand"
        defaultValue={v?.responsibleId ?? activity?.responsibleId ?? ""}
      />
      <TextareaField
        id={`${prefix}-description`}
        name="description"
        label="Toelichting"
        rows={2}
        maxLength={2000}
        defaultValue={v?.description ?? activity?.description ?? ""}
        error={state.fieldErrors?.description}
        className="sm:col-span-2"
      />
      <SubmitButton className="sm:col-span-2 sm:justify-self-start">
        {activity ? "Activiteit opslaan" : "Activiteit inplannen"}
      </SubmitButton>
    </form>
  );
}
