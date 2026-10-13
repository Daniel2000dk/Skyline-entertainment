"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { CodeField } from "@/components/auth/code-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState, type FormState } from "@/lib/forms";
import { confirmMfaEnrollment, disableMfa, startMfaEnrollment, type EnrollState } from "./actions";

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.status === "error" ? "destructive" : "success"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export function MfaSetup() {
  const [enroll, start] = useActionState<EnrollState>(startMfaEnrollment, idleFormState);
  const [confirm, confirmAction] = useActionState(confirmMfaEnrollment, idleFormState);

  if (!enroll.factorId) {
    return (
      <form action={start} className="flex flex-col gap-3">
        <Message state={enroll} />
        <SubmitButton className="self-start" pendingLabel="Bezig…">
          Tweestapsverificatie instellen
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          Open een authenticator-app (bijv. Google Authenticator, Microsoft Authenticator of
          1Password).
        </li>
        <li>Scan de QR-code of voer de sleutel handmatig in.</li>
        <li>Vul de 6-cijferige code in die de app toont.</li>
      </ol>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {enroll.qrCode && (
          <Image
            src={enroll.qrCode}
            alt="QR-code voor je authenticator-app"
            width={176}
            height={176}
            unoptimized
            className="rounded-lg bg-white p-2"
          />
        )}
        <div className="min-w-0 text-sm">
          <p className="text-muted-foreground">Kun je niet scannen? Voer deze sleutel in:</p>
          <code
            data-testid="mfa-secret"
            className="mt-1 block rounded-md bg-muted px-2 py-1 font-mono break-all"
          >
            {enroll.secret}
          </code>
        </div>
      </div>
      <form action={confirmAction} className="flex flex-col gap-3 sm:max-w-xs" noValidate>
        <input type="hidden" name="factorId" value={enroll.factorId} />
        <Message state={confirm} />
        <CodeField error={confirm.fieldErrors?.code} />
        <SubmitButton pendingLabel="Bezig met controleren…">Bevestigen</SubmitButton>
      </form>
    </div>
  );
}

export function MfaDisable() {
  const [state, action] = useActionState<FormState>(disableMfa, idleFormState);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="flex flex-col gap-3">
        <Message state={state} />
        <p className="text-sm">
          Tweestapsverificatie staat aan. Bij het inloggen vragen we na je wachtwoord om een code.
        </p>
        <Button variant="outline" className="self-start" onClick={() => setConfirming(true)}>
          Tweestapsverificatie uitzetten
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <Message state={state} />
      <p className="text-sm">
        Zonder tweestapsverificatie is je account alleen met je wachtwoord beveiligd. Weet je het
        zeker?
      </p>
      <div className="flex gap-2">
        <SubmitButton variant="destructive">Ja, uitzetten</SubmitButton>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Annuleren
        </Button>
      </div>
    </form>
  );
}
