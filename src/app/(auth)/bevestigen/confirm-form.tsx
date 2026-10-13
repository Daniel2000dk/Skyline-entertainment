"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { confirmLink } from "./actions";

export function ConfirmForm({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [state, action] = useActionState(confirmLink, idleFormState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value={type} />
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <SubmitButton size="lg" pendingLabel="Bezig met controleren…">
        Doorgaan
      </SubmitButton>
    </form>
  );
}
