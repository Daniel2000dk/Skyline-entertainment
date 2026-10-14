"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { deleteProject } from "../actions";

export function DangerZone({ projectId, title }: { projectId: string; title: string }) {
  const [state, action] = useActionState(deleteProject, idleFormState);
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="ring-destructive/30">
      <CardHeader>
        <CardTitle>
          <h2>Project verwijderen</h2>
        </CardTitle>
        <CardDescription>
          Verwijdert het project met taken, checklist en draaiboek. Liever bewaren? Zet de status op
          Gearchiveerd. De activiteitenlog blijft altijd bewaard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!confirming ? (
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            Project verwijderen
          </Button>
        ) : (
          <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="projectId" value={projectId} />
            <FormMessage state={state} />
            <p className="text-sm">
              Weet je zeker dat je <strong>{title}</strong> definitief wilt verwijderen?
            </p>
            <div className="flex gap-2">
              <SubmitButton variant="destructive">Ja, definitief verwijderen</SubmitButton>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Annuleren
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
