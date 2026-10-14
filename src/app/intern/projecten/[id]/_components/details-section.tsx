"use client";

import { useActionState, useState } from "react";
import { FormField, SelectField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime, formatGta, isoToLocalInput } from "@/lib/datetime";
import { idleFormState, type FormState } from "@/lib/forms";
import { REGISTRATION_MODES, REGISTRATION_MODE_LABELS } from "@/lib/projects/labels";
import type { EventTypeOption, ProjectDetail } from "@/lib/projects/queries";
import { updateProjectDetails } from "../actions";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm whitespace-pre-line">{children || "—"}</dd>
    </div>
  );
}

export function DetailsSection({
  project,
  eventTypes,
  canEdit,
}: {
  project: ProjectDetail;
  eventTypes: EventTypeOption[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await updateProjectDetails(prev, formData);
    if (result.status === "success") setEditing(false);
    return result;
  }, idleFormState);

  const event = project.event;
  const v = state.status === "error" ? state.values : undefined;
  const errors = state.fieldErrors;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Details</h2>
        </CardTitle>
        {canEdit && !editing && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Bewerken
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!editing && state.status === "success" && <FormMessage state={state} />}

        {!editing ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Type">{project.eventTypeName}</Detail>
            <Detail label="Locatie">{event?.location}</Detail>
            <Detail label="Start">{formatDateTime(event?.startsAt)}</Detail>
            <Detail label="Einde">{event?.endsAt && formatDateTime(event.endsAt)}</Detail>
            <Detail label="Max. deelnemers">{event?.capacity}</Detail>
            <Detail label="Inschrijfgeld">{formatGta(event?.entryFee)}</Detail>
            <Detail label="Budget">{formatGta(project.budget)}</Detail>
            <Detail label="Inschrijving">
              {event && REGISTRATION_MODE_LABELS[event.registrationMode]}
            </Detail>
            <div className="sm:col-span-2">
              <Detail label="Omschrijving (intern)">{project.description}</Detail>
            </div>
            <div className="sm:col-span-2">
              <Detail label="Korte publieke tekst">{event?.summary}</Detail>
            </div>
            <div className="sm:col-span-2">
              <Detail label="Spelregels">{event?.rules}</Detail>
            </div>
          </dl>
        ) : (
          <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
            <input type="hidden" name="projectId" value={project.id} />
            <div className="sm:col-span-2">
              <FormMessage state={state} />
            </div>
            <FormField
              id="title"
              label="Naam"
              required
              maxLength={120}
              defaultValue={v?.title ?? project.title}
              error={errors?.title}
              className="sm:col-span-2"
            />
            <SelectField
              id="eventTypeId"
              label="Type evenement"
              options={eventTypes.map((type) => ({ value: type.id, label: type.name }))}
              emptyLabel="Geen"
              defaultValue={v?.eventTypeId ?? project.eventTypeId ?? ""}
              error={errors?.eventTypeId}
            />
            <FormField
              id="location"
              label="Locatie"
              maxLength={120}
              defaultValue={v?.location ?? event?.location ?? ""}
              error={errors?.location}
            />
            <FormField
              id="startsAt"
              label="Start"
              type="datetime-local"
              hint="Nederlandse tijd"
              defaultValue={v?.startsAt ?? isoToLocalInput(event?.startsAt)}
              error={errors?.startsAt}
            />
            <FormField
              id="endsAt"
              label="Einde"
              type="datetime-local"
              defaultValue={v?.endsAt ?? isoToLocalInput(event?.endsAt)}
              error={errors?.endsAt}
            />
            <FormField
              id="capacity"
              label="Max. deelnemers"
              type="number"
              min={1}
              max={1000}
              inputMode="numeric"
              defaultValue={v?.capacity ?? event?.capacity?.toString() ?? ""}
              error={errors?.capacity}
            />
            <FormField
              id="entryFee"
              label="Inschrijfgeld (GTA$)"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={v?.entryFee ?? String(event?.entryFee ?? 0)}
              error={errors?.entryFee}
            />
            <FormField
              id="budget"
              label="Budget (GTA$)"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={v?.budget ?? String(project.budget)}
              error={errors?.budget}
            />
            <SelectField
              id="registrationMode"
              label="Inschrijving"
              options={REGISTRATION_MODES.map((mode) => ({
                value: mode,
                label: REGISTRATION_MODE_LABELS[mode],
              }))}
              defaultValue={v?.registrationMode ?? event?.registrationMode ?? "closed"}
              error={errors?.registrationMode}
            />
            <TextareaField
              id="description"
              label="Omschrijving (intern)"
              rows={4}
              maxLength={5000}
              defaultValue={v?.description ?? project.description ?? ""}
              error={errors?.description}
              className="sm:col-span-2"
            />
            <TextareaField
              id="summary"
              label="Korte publieke tekst"
              hint="Komt later op de publieke evenementpagina."
              rows={2}
              maxLength={300}
              defaultValue={v?.summary ?? event?.summary ?? ""}
              error={errors?.summary}
              className="sm:col-span-2"
            />
            <TextareaField
              id="rules"
              label="Spelregels"
              rows={4}
              maxLength={5000}
              defaultValue={v?.rules ?? event?.rules ?? ""}
              error={errors?.rules}
              className="sm:col-span-2"
            />
            <div className="flex gap-2 sm:col-span-2">
              <SubmitButton pendingLabel="Bezig met opslaan…">Wijzigingen opslaan</SubmitButton>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Annuleren
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
