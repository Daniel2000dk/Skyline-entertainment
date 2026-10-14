"use client";

import { useActionState, useState } from "react";
import { SelectField, FormField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState, type FormState } from "@/lib/forms";
import type { IdeaCard } from "@/lib/ideas/queries";
import type { EventTypeOption } from "@/lib/projects/queries";
import { convertIdea, decideIdea, deleteIdea, updateIdea } from "../actions";

export function EditIdea({ idea }: { idea: IdeaCard }) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await updateIdea(prev, formData);
    if (result.status === "success") setEditing(false);
    return result;
  }, idleFormState);

  if (!editing) {
    return (
      <Button variant="outline" size="sm" className="self-start" onClick={() => setEditing(true)}>
        Idee bewerken
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="ideaId" value={idea.id} />
      <FormMessage state={state} />
      <FormField
        id="title"
        label="Idee"
        required
        maxLength={120}
        defaultValue={state.values?.title ?? idea.title}
        error={state.fieldErrors?.title}
      />
      <TextareaField
        id="description"
        label="Omschrijving"
        rows={4}
        maxLength={5000}
        defaultValue={state.values?.description ?? idea.description ?? ""}
        error={state.fieldErrors?.description}
      />
      <div className="flex gap-2">
        <SubmitButton>Idee opslaan</SubmitButton>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}

export function DecideIdea({ idea }: { idea: IdeaCard }) {
  const [state, action] = useActionState(decideIdea, idleFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="ideaId" value={idea.id} />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        {idea.status === "new" && (
          <SubmitButton size="sm" variant="outline" name="decision" value="discussing">
            In bespreking nemen
          </SubmitButton>
        )}
        <SubmitButton size="sm" name="decision" value="approve">
          Goedkeuren
        </SubmitButton>
        <SubmitButton size="sm" variant="outline" name="decision" value="reject">
          Afwijzen
        </SubmitButton>
      </div>
    </form>
  );
}

export function ConvertIdea({
  idea,
  eventTypes,
}: {
  idea: IdeaCard;
  eventTypes: EventTypeOption[];
}) {
  const [state, action] = useActionState(convertIdea, idleFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="ideaId" value={idea.id} />
      <FormMessage state={state} />
      <SelectField
        id="eventTypeId"
        label="Type evenement"
        hint="De standaardtaken van dit type worden toegevoegd. Naam en omschrijving komen uit het idee."
        options={eventTypes.map((type) => ({ value: type.id, label: type.name }))}
        emptyLabel="Geen / later kiezen"
        defaultValue=""
      />
      <SubmitButton className="self-start" pendingLabel="Bezig met omzetten…">
        Project starten
      </SubmitButton>
    </form>
  );
}

export function DeleteIdea({ idea }: { idea: IdeaCard }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action] = useActionState(deleteIdea, idleFormState);
  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" className="self-start" onClick={() => setConfirming(true)}>
        Idee verwijderen
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="ideaId" value={idea.id} />
      <FormMessage state={state} />
      <p className="text-sm">Dit idee met reacties en stemmen verwijderen?</p>
      <div className="flex gap-2">
        <SubmitButton size="sm" variant="destructive">
          Ja, verwijderen
        </SubmitButton>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
