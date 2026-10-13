"use client";

import { Suspense, useActionState } from "react";
import { CodeField } from "@/components/auth/code-field";
import { NextPathInput } from "@/components/auth/next-path-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { verifyLoginCode } from "./actions";

export function MfaForm() {
  const [state, action] = useActionState(verifyLoginCode, idleFormState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Suspense fallback={<input type="hidden" name="next" value="" />}>
        <NextPathInput />
      </Suspense>
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
      <CodeField error={state.fieldErrors?.code} />
      <SubmitButton size="lg" pendingLabel="Bezig met controleren…">
        Bevestigen
      </SubmitButton>
    </form>
  );
}
