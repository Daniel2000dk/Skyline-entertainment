"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { requestPasswordReset } from "./actions";

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, idleFormState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-5">
        <Alert variant="success">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Link href="/login" className="text-center text-sm underline-offset-4 hover:underline">
          Terug naar inloggen
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormField
        id="email"
        label="E-mailadres"
        type="email"
        autoComplete="username"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.fieldErrors?.email}
      />
      <SubmitButton size="lg" pendingLabel="Bezig met versturen…">
        Herstellink versturen
      </SubmitButton>
      <Link
        href="/login"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Terug naar inloggen
      </Link>
    </form>
  );
}
