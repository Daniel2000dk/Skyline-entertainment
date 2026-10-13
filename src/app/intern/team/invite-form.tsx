"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, STAFF_ROLES } from "@/lib/auth/roles";
import { inviteStaff, type LinkFormState } from "./actions";
import { LinkResult } from "./link-result";

const initialState: LinkFormState = { status: "idle" };

export function InviteForm() {
  const [state, action] = useActionState(inviteStaff, initialState);

  return (
    <div className="flex flex-col gap-4">
      {state.status === "success" && state.link && (
        <>
          <Alert variant="success">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
          <LinkResult link={state.link} label="Uitnodigingslink" />
        </>
      )}
      {state.status === "error" && state.message && (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      <form
        action={action}
        className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto] md:items-start"
        noValidate
      >
        <FormField
          id="email"
          label="E-mailadres"
          type="email"
          autoComplete="off"
          required
          defaultValue={state.status === "error" ? state.values?.email : undefined}
          error={state.fieldErrors?.email}
        />
        <FormField
          id="displayName"
          label="Naam"
          autoComplete="off"
          required
          maxLength={60}
          defaultValue={state.status === "error" ? state.values?.displayName : undefined}
          error={state.fieldErrors?.displayName}
        />
        <Field data-invalid={state.fieldErrors?.role ? true : undefined}>
          <FieldLabel htmlFor="role">Rol</FieldLabel>
          <NativeSelect
            id="role"
            name="role"
            defaultValue={state.status === "error" ? state.values?.role : "team_member"}
            aria-describedby="role-hint"
          >
            {STAFF_ROLES.map((role) => (
              <NativeSelectOption key={role} value={role}>
                {ROLE_LABELS[role]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {state.fieldErrors?.role && <FieldError>{state.fieldErrors.role}</FieldError>}
        </Field>
        {/* Outside <Field>: it resets width on .sr-only children, which made this overflow. */}
        <p id="role-hint" className="sr-only">
          {STAFF_ROLES.map((role) => `${ROLE_LABELS[role]}: ${ROLE_DESCRIPTIONS[role]}`).join(" ")}
        </p>
        <SubmitButton className="md:mt-[1.625rem]" pendingLabel="Bezig…">
          Uitnodigen
        </SubmitButton>
      </form>
    </div>
  );
}
