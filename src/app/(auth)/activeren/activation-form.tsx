"use client";

import { Suspense, useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { activateAccount } from "./actions";
import { TokenInput } from "./token-input";

export function ActivationForm() {
  const [state, action] = useActionState(activateAccount, idleFormState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Suspense fallback={<input type="hidden" name="token" value="" />}>
        <TokenInput />
      </Suspense>
      <FormMessage state={state} />
      <FormField
        id="code"
        label="Activatiecode"
        hint="De code van 8 tekens die je apart van deze link hebt gekregen."
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={12}
        defaultValue={state.values?.code}
        error={state.fieldErrors?.code}
      />
      <FormField
        id="password"
        label="Nieuw wachtwoord"
        hint="Minimaal 12 tekens, met letters én cijfers."
        type="password"
        autoComplete="new-password"
        required
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
      <SubmitButton size="lg" pendingLabel="Bezig met activeren…">
        Account activeren
      </SubmitButton>
    </form>
  );
}
