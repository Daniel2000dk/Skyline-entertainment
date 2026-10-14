"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@/lib/auth/roles";
import { idleFormState, type FormState } from "@/lib/forms";
import { Input } from "@/components/ui/input";
import {
  createLoginLink,
  resetStaffMfa,
  setStaffActive,
  updateStaffRole,
  updateStaffUsername,
  type LinkFormState,
} from "./actions";
import { LinkResult } from "./link-result";

function Feedback({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.status === "error" ? "destructive" : "success"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export function RoleForm({
  staffId,
  role,
  name,
}: {
  staffId: string;
  role: StaffRole;
  name: string;
}) {
  const [state, action] = useActionState(updateStaffRole, idleFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="staffId" value={staffId} />
      <div className="flex gap-2">
        <NativeSelect name="role" defaultValue={role} aria-label={`Rol van ${name}`}>
          {STAFF_ROLES.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {ROLE_LABELS[option]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <SubmitButton variant="outline" aria-label={`Rol van ${name} opslaan`}>
          Opslaan
        </SubmitButton>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function UsernameForm({
  staffId,
  username,
  name,
}: {
  staffId: string;
  username: string;
  name: string;
}) {
  const [state, action] = useActionState(updateStaffUsername, idleFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="staffId" value={staffId} />
      <div className="flex gap-2">
        <Input
          name="username"
          defaultValue={username}
          maxLength={30}
          autoCapitalize="none"
          spellCheck={false}
          aria-label={`Gebruikersnaam van ${name}`}
        />
        <SubmitButton variant="outline" aria-label={`Gebruikersnaam van ${name} opslaan`}>
          Opslaan
        </SubmitButton>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function LoginLinkForm({ staffId, name }: { staffId: string; name: string }) {
  const [state, action] = useActionState<LinkFormState, FormData>(createLoginLink, idleFormState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="staffId" value={staffId} />
      <SubmitButton variant="outline" aria-label={`Nieuwe activatielink voor ${name}`}>
        Nieuwe activatielink
      </SubmitButton>
      {state.link && state.code && (
        <LinkResult link={state.link} code={state.code} label={`Activatielink voor ${name}`} />
      )}
      {state.status === "error" && <Feedback state={state} />}
    </form>
  );
}

export function ActiveToggle({
  staffId,
  name,
  isActive,
}: {
  staffId: string;
  name: string;
  isActive: boolean;
}) {
  const [state, action] = useActionState(setStaffActive, idleFormState);
  const [confirming, setConfirming] = useState(false);

  if (isActive && !confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="destructive" onClick={() => setConfirming(true)}>
          Deactiveren
        </Button>
        <Feedback state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="staffId" value={staffId} />
      <input type="hidden" name="active" value={isActive ? "false" : "true"} />
      {isActive && (
        <p className="text-sm">{name} verliest direct alle toegang. Weet je het zeker?</p>
      )}
      <div className="flex gap-2">
        <SubmitButton variant={isActive ? "destructive" : "outline"}>
          {isActive ? "Ja, deactiveren" : "Heractiveren"}
        </SubmitButton>
        {isActive && (
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            Annuleren
          </Button>
        )}
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function MfaResetForm({ staffId, name }: { staffId: string; name: string }) {
  const [state, action] = useActionState(resetStaffMfa, idleFormState);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="flex flex-col gap-2">
        <Button variant="outline" onClick={() => setConfirming(true)}>
          2FA resetten
        </Button>
        <Feedback state={state} />
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="staffId" value={staffId} />
      <p className="text-sm">
        Alleen doen als {name} geen toegang meer heeft tot de authenticator-app. Daarna kan {name}{" "}
        inloggen met alleen het wachtwoord.
      </p>
      <div className="flex gap-2">
        <SubmitButton variant="destructive">Ja, resetten</SubmitButton>
        <Button variant="ghost" onClick={() => setConfirming(false)}>
          Annuleren
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
