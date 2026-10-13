/** Shared result shape for form Server Actions used with useActionState. */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Submitted values to restore after a failed submission (never secrets). */
  values?: Record<string, string>;
};

export const idleFormState: FormState = { status: "idle" };

export function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
