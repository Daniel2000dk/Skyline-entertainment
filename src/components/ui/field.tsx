import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-md border border-border-strong bg-surface px-3 text-foreground placeholder:text-muted/70 hover:border-muted aria-[invalid=true]:border-danger";

type FieldProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

function describedBy(id: string, hint?: string, error?: string) {
  return cn(hint && `${id}-hint`, error && `${id}-error`) || undefined;
}

function FieldMeta({ id, hint, error }: Omit<FieldProps, "label">) {
  return (
    <>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

/** Labelled text input with hint and error text wired up for screen readers. */
export function TextField({
  id,
  label,
  hint,
  error,
  className,
  ...props
}: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={cn(control, "h-11")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      />
      <FieldMeta id={id} hint={hint} error={error} />
    </div>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  className,
  options,
  ...props
}: FieldProps &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & {
    options: ReadonlyArray<{ value: string; label: string }>;
  }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        name={id}
        className={cn(control, "h-11")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMeta id={id} hint={hint} error={error} />
    </div>
  );
}
