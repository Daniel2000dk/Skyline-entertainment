"use client";

import { useActionState, useState } from "react";
import { rescheduleEvent } from "@/app/intern/planning/actions";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { isoToLocalInput } from "@/lib/datetime";
import { idleFormState } from "@/lib/forms";

export function RescheduleForm({
  projectId,
  startsAt,
  title,
}: {
  projectId: string;
  startsAt: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(rescheduleEvent, idleFormState);

  if (!open) {
    return (
      <Button size="xs" variant="ghost" className="mt-1" onClick={() => setOpen(true)}>
        Verplaatsen
      </Button>
    );
  }
  return (
    <form action={action} className="mt-2 flex flex-col gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <FormMessage state={state} />
      <label htmlFor={`move-${projectId}`} className="text-xs font-medium">
        Nieuwe start voor {title}
      </label>
      <Input
        id={`move-${projectId}`}
        name="startsAt"
        type="datetime-local"
        defaultValue={isoToLocalInput(startsAt)}
      />
      <div className="flex gap-2">
        <SubmitButton size="sm">Verplaatsen</SubmitButton>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
