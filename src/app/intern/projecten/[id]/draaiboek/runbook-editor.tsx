"use client";

import { PencilIcon, Trash2Icon } from "lucide-react";
import { useActionState, useState } from "react";
import { FormField, SelectField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatTime, isoToLocalInput } from "@/lib/datetime";
import { idleFormState, type FormState } from "@/lib/forms";
import type { RunbookItem, StaffOption } from "@/lib/projects/queries";
import { deleteRunbookItem, saveRunbookItem } from "../actions";

function RunbookForm({
  projectId,
  staff,
  item,
  onDone,
}: {
  projectId: string;
  staff: StaffOption[];
  item?: RunbookItem;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await saveRunbookItem(prev, formData);
    if (result.status === "success") onDone?.();
    return result;
  }, idleFormState);
  const prefix = item ? `rb-${item.id}` : "rb-new";
  const v = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
      <input type="hidden" name="projectId" value={projectId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <FormField
        id={`${prefix}-title`}
        name="title"
        label="Onderdeel"
        required
        maxLength={160}
        defaultValue={v?.title ?? item?.title}
        error={state.fieldErrors?.title}
      />
      <FormField
        id={`${prefix}-startsAt`}
        name="startsAt"
        label="Tijd"
        type="datetime-local"
        defaultValue={v?.startsAt ?? isoToLocalInput(item?.startsAt)}
        error={state.fieldErrors?.startsAt}
      />
      <SelectField
        id={`${prefix}-responsibleId`}
        name="responsibleId"
        label="Verantwoordelijke"
        options={staff.map((person) => ({ value: person.id, label: person.displayName }))}
        emptyLabel="Niemand"
        defaultValue={v?.responsibleId ?? item?.responsibleId ?? ""}
      />
      <TextareaField
        id={`${prefix}-details`}
        name="details"
        label="Toelichting"
        rows={2}
        maxLength={2000}
        defaultValue={v?.details ?? item?.details ?? ""}
        error={state.fieldErrors?.details}
        className="sm:col-span-2"
      />
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton>{item ? "Opslaan" : "Toevoegen"}</SubmitButton>
        {onDone && item && (
          <Button variant="ghost" onClick={onDone}>
            Annuleren
          </Button>
        )}
      </div>
    </form>
  );
}

function RunbookRow({
  projectId,
  item,
  staff,
  canEdit,
}: {
  projectId: string;
  item: RunbookItem;
  staff: StaffOption[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-lg border p-4">
        <RunbookForm
          projectId={projectId}
          staff={staff}
          item={item}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex gap-4 rounded-lg border p-4">
      <div className="w-20 shrink-0">
        <p className="font-mono text-sm font-semibold text-primary">
          {formatTime(item.startsAt) || "—"}
        </p>
        {item.startsAt && (
          <p className="text-xs text-muted-foreground">{formatDate(item.startsAt)}</p>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{item.title}</p>
        {item.details && (
          <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{item.details}</p>
        )}
        {item.responsibleName && (
          <p className="mt-1 text-xs text-muted-foreground">
            Verantwoordelijk: {item.responsibleName}
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-start gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`${item.title} bewerken`}
            onClick={() => setEditing(true)}
          >
            <PencilIcon aria-hidden="true" />
          </Button>
          <form action={deleteRunbookItem}>
            <input type="hidden" name="itemId" value={item.id} />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              aria-label={`${item.title} verwijderen`}
            >
              <Trash2Icon aria-hidden="true" />
            </Button>
          </form>
        </div>
      )}
    </li>
  );
}

export function RunbookEditor({
  projectId,
  items,
  staff,
  canEdit,
}: {
  projectId: string;
  items: RunbookItem[];
  staff: StaffOption[];
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen draaiboek. {canEdit ? "Voeg hieronder het eerste onderdeel toe." : ""}
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) => (
            <RunbookRow
              key={item.id}
              projectId={projectId}
              item={item}
              staff={staff}
              canEdit={canEdit}
            />
          ))}
        </ol>
      )}
      {canEdit && (
        <section aria-labelledby="runbook-add" className="rounded-lg border border-dashed p-4">
          <h2 id="runbook-add" className="mb-3 font-medium">
            Onderdeel toevoegen
          </h2>
          <RunbookForm projectId={projectId} staff={staff} />
        </section>
      )}
    </div>
  );
}
