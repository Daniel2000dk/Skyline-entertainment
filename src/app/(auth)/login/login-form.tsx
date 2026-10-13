"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import { login } from "./actions";
import { NextPathInput } from "./next-path-input";

export function LoginForm() {
  const [state, action] = useActionState(login, idleFormState);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {/* Only this hidden field waits for the URL; the visible form is static. */}
      <Suspense fallback={<input type="hidden" name="next" value="" />}>
        <NextPathInput />
      </Suspense>
      {state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}
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
      <FormField
        id="password"
        label="Wachtwoord"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />
      <SubmitButton size="lg" pendingLabel="Bezig met inloggen…">
        Inloggen
      </SubmitButton>
      <Link
        href="/wachtwoord-vergeten"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        Wachtwoord vergeten?
      </Link>
    </form>
  );
}
