import type { ComponentProps, ReactNode } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type FieldShell = { id: string; label: string; hint?: string; error?: string; className?: string };

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

function Shell({
  id,
  label,
  hint,
  error,
  className,
  children,
}: FieldShell & { children: ReactNode }) {
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {hint && <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  );
}

/** Labelled input with hint and error wired to aria-describedby. */
export function FormField({
  id,
  label,
  hint,
  error,
  className,
  inputClassName,
  ...rest
}: FieldShell &
  Omit<ComponentProps<typeof Input>, "id" | "className"> & { inputClassName?: string }) {
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <Input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={inputClassName}
        {...rest}
      />
    </Shell>
  );
}

export function TextareaField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: FieldShell & Omit<ComponentProps<typeof Textarea>, "id" | "className">) {
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <Textarea
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
    </Shell>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  className,
  options,
  emptyLabel,
  ...props
}: FieldShell &
  Omit<ComponentProps<typeof NativeSelect>, "id" | "className"> & {
    options: ReadonlyArray<{ value: string; label: string }>;
    /** Adds a first option with value "" (e.g. "Geen"). */
    emptyLabel?: string;
  }) {
  return (
    <Shell id={id} label={label} hint={hint} error={error} className={className}>
      <NativeSelect
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      >
        {emptyLabel !== undefined && <NativeSelectOption value="">{emptyLabel}</NativeSelectOption>}
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </Shell>
  );
}
