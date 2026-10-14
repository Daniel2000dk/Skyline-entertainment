"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/form/form-message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { PROJECT_STATUSES, STATUS_LABELS, type ProjectStatus } from "@/lib/projects/labels";
import { changeProjectStatus } from "../actions";

export function StatusSection({ projectId, status }: { projectId: string; status: ProjectStatus }) {
  const [state, action] = useActionState(changeProjectStatus, idleFormState);
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Status</h2>
        </CardTitle>
        <CardDescription>
          Idee → In bespreking → Goedgekeurd → In voorbereiding → Gepubliceerd → Afgerond →
          Gearchiveerd. Publiceren kan pas met een starttijd.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <FormMessage state={state} />
          <div className="flex gap-2">
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <NativeSelect id="status" name="status" defaultValue={status} key={status}>
              {PROJECT_STATUSES.map((option) => (
                <NativeSelectOption key={option} value={option}>
                  {STATUS_LABELS[option]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <SubmitButton variant="outline">Status opslaan</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
