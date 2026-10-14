"use client";

import { useActionState, useState } from "react";
import {
  createSuggestion,
  decideSuggestion,
  withdrawSuggestion,
} from "@/app/intern/discussie/actions";
import { FormField, SelectField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatGta } from "@/lib/datetime";
import type { SuggestionView } from "@/lib/discussions/queries";
import { idleFormState } from "@/lib/forms";
import {
  SUGGESTION_FIELDS,
  SUGGESTION_FIELD_KEYS,
  type SuggestionField,
} from "@/lib/validation/discussions";
import { Discussion } from "./discussion";

const STATUS: Record<
  SuggestionView["status"],
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  open: { label: "Open", variant: "default" },
  accepted: { label: "Geaccepteerd", variant: "secondary" },
  rejected: { label: "Afgewezen", variant: "destructive" },
  withdrawn: { label: "Ingetrokken", variant: "outline" },
};

export function formatFieldValue(field: SuggestionField, value: string | null): string {
  if (value === null || value === "") return "(leeg)";
  const kind = SUGGESTION_FIELDS[field].kind;
  if (kind === "datetime") return formatDateTime(value);
  if (kind === "gta") return formatGta(Number(value));
  return value;
}

function ValueInput({
  field,
  error,
  defaultValue,
}: {
  field: SuggestionField;
  error?: string;
  defaultValue?: string;
}) {
  const spec = SUGGESTION_FIELDS[field];
  const common = {
    id: "proposedValue",
    label: `Nieuwe waarde: ${spec.label}`,
    error,
    defaultValue,
    required: true,
  };
  if (spec.kind === "textarea") return <TextareaField {...common} rows={3} maxLength={spec.max} />;
  if (spec.kind === "datetime")
    return <FormField {...common} type="datetime-local" hint="Nederlandse tijd" />;
  if (spec.kind === "gta" || spec.kind === "capacity") {
    return (
      <FormField
        {...common}
        type="number"
        min={spec.kind === "capacity" ? 1 : 0}
        step={1}
        inputMode="numeric"
      />
    );
  }
  return <FormField {...common} maxLength={spec.max} />;
}

export function SuggestionForm({ projectId }: { projectId: string }) {
  const [state, action] = useActionState(createSuggestion, idleFormState);
  const [field, setField] = useState<SuggestionField | "">("");
  const v = state.status === "error" ? state.values : undefined;

  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="projectId" value={projectId} />
      <FormMessage state={state} />
      <SelectField
        id="field"
        label="Waarover gaat je voorstel?"
        options={SUGGESTION_FIELD_KEYS.map((key) => ({
          value: key,
          label: SUGGESTION_FIELDS[key].label,
        }))}
        emptyLabel="Algemeen voorstel (geen veld)"
        value={field}
        onChange={(event) => setField(event.target.value as SuggestionField | "")}
        error={state.fieldErrors?.field}
      />
      {field ? (
        <ValueInput
          key={field}
          field={field}
          error={state.fieldErrors?.proposedValue}
          defaultValue={v?.proposedValue}
        />
      ) : (
        <input type="hidden" name="proposedValue" value="" />
      )}
      <TextareaField
        id="message"
        label="Toelichting"
        rows={2}
        maxLength={2000}
        required
        defaultValue={v?.message}
        error={state.fieldErrors?.message}
      />
      <SubmitButton className="self-start">Suggestie indienen</SubmitButton>
    </form>
  );
}

function DecisionForm({ suggestionId }: { suggestionId: string }) {
  const [state, action] = useActionState(decideSuggestion, idleFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="suggestionId" value={suggestionId} />
      <FormMessage state={state} />
      <label htmlFor={`note-${suggestionId}`} className="sr-only">
        Toelichting bij je besluit
      </label>
      <input
        id={`note-${suggestionId}`}
        name="note"
        maxLength={1000}
        placeholder="Toelichting (optioneel)"
        className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
      />
      <div className="flex gap-2">
        <SubmitButton size="sm" name="decision" value="accept">
          Accepteren
        </SubmitButton>
        <SubmitButton size="sm" variant="outline" name="decision" value="reject">
          Afwijzen
        </SubmitButton>
      </div>
    </form>
  );
}

export function SuggestionCard({
  suggestion,
  currentValues,
  canDecide,
  currentStaffId,
  isAdmin,
}: {
  suggestion: SuggestionView;
  currentValues: Record<SuggestionField, string | null>;
  canDecide: boolean;
  currentStaffId: string;
  isAdmin: boolean;
}) {
  const status = STATUS[suggestion.status];
  const isOpen = suggestion.status === "open";
  const replies = suggestion.threads.reduce((sum, thread) => sum + 1 + thread.replies.length, 0);

  return (
    <article
      className="flex flex-col gap-3 rounded-lg border p-4"
      aria-label={`Suggestie van ${suggestion.authorName}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {suggestion.field
            ? `Wijziging: ${SUGGESTION_FIELDS[suggestion.field].label}`
            : "Algemeen voorstel"}
        </p>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      {suggestion.field && (
        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Nu</dt>
            <dd className="break-words whitespace-pre-line">
              {formatFieldValue(suggestion.field, currentValues[suggestion.field])}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Voorstel</dt>
            <dd className="break-words whitespace-pre-line text-primary">
              {formatFieldValue(suggestion.field, suggestion.proposedValue)}
            </dd>
          </div>
        </dl>
      )}
      <p className="text-sm whitespace-pre-line">{suggestion.message}</p>
      <p className="text-xs text-muted-foreground">
        {suggestion.authorName} · {formatDateTime(suggestion.createdAt)}
        {suggestion.decidedByName &&
          ` · ${status.label.toLowerCase()} door ${suggestion.decidedByName}`}
        {suggestion.decisionNote && ` · "${suggestion.decisionNote}"`}
      </p>

      {isOpen && canDecide && <DecisionForm suggestionId={suggestion.id} />}
      {isOpen && suggestion.authorId === currentStaffId && (
        <form action={withdrawSuggestion}>
          <input type="hidden" name="suggestionId" value={suggestion.id} />
          <Button type="submit" size="sm" variant="ghost">
            Intrekken
          </Button>
        </form>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Reacties ({replies})</summary>
        <div className="mt-3">
          <Discussion
            subject={{ suggestionId: suggestion.id }}
            threads={suggestion.threads}
            currentStaffId={currentStaffId}
            isAdmin={isAdmin}
            emptyText="Nog geen reacties."
          />
        </div>
      </details>
    </article>
  );
}
