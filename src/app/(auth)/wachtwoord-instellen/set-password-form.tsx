"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { setPassword } from "./actions";

export function SetPasswordForm() {
  const [state, action] = useActionState(setPassword, idleFormState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <FormField
        id="password"
        label="Nieuw wachtwoord"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        hint="Minimaal 12 tekens, met letters en cijfers."
        error={state.fieldErrors?.password}
      />
      <FormField
        id="confirm"
        label="Herhaal wachtwoord"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirm}
      />
      <SubmitButton size="lg" pendingLabel="Bezig met opslaan…">
        Wachtwoord opslaan
      </SubmitButton>
    </form>
  );
}
