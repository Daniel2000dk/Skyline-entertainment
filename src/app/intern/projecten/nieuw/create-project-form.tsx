"use client";

import { useActionState } from "react";
import { FormField, SelectField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import type { EventTypeOption } from "@/lib/projects/queries";
import { createProject } from "../actions";

export function CreateProjectForm({ eventTypes }: { eventTypes: EventTypeOption[] }) {
  const [state, action] = useActionState(createProject, idleFormState);
  const v = state.values;

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <FormField
        id="title"
        label="Naam"
        required
        maxLength={120}
        defaultValue={v?.title}
        error={state.fieldErrors?.title}
      />
      <SelectField
        id="eventTypeId"
        label="Type evenement"
        hint="De standaardtaken van dit type worden automatisch toegevoegd."
        options={eventTypes.map((type) => ({ value: type.id, label: type.name }))}
        emptyLabel="Geen / later kiezen"
        defaultValue={v?.eventTypeId ?? ""}
        error={state.fieldErrors?.eventTypeId}
      />
      <FormField
        id="startsAt"
        label="Start (optioneel)"
        type="datetime-local"
        hint="Nederlandse tijd. Deadlines van standaardtaken rekenen hiervanaf."
        defaultValue={v?.startsAt}
        error={state.fieldErrors?.startsAt}
      />
      <TextareaField
        id="description"
        label="Omschrijving (optioneel)"
        rows={4}
        maxLength={5000}
        defaultValue={v?.description}
        error={state.fieldErrors?.description}
      />
      <SubmitButton className="self-start" pendingLabel="Bezig met aanmaken…">
        Project aanmaken
      </SubmitButton>
    </form>
  );
}
