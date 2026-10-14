"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { revertRevision } from "../actions";

export function RevertButton({ revisionId }: { revisionId: number }) {
  const [state, action] = useActionState(revertRevision, idleFormState);
  const [confirming, setConfirming] = useState(false);

  if (state.status === "success") return <FormMessage state={state} />;
  if (!confirming) {
    return (
      <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
        Terugzetten
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="revisionId" value={revisionId} />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton size="sm">Ja, terugzetten</SubmitButton>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
