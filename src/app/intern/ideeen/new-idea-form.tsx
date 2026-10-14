"use client";

import { useActionState } from "react";
import { FormField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { createIdea } from "./actions";

export function NewIdeaForm() {
  const [state, action] = useActionState(createIdea, idleFormState);
  const v = state.values;
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <FormField
        id="title"
        label="Idee"
        required
        maxLength={120}
        defaultValue={v?.title}
        error={state.fieldErrors?.title}
      />
      <TextareaField
        id="description"
        label="Omschrijving (optioneel)"
        rows={3}
        maxLength={5000}
        defaultValue={v?.description}
        error={state.fieldErrors?.description}
      />
      <SubmitButton className="self-start">Idee plaatsen</SubmitButton>
    </form>
  );
}
