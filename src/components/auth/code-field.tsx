import { FormField } from "@/components/form/form-field";

/** Six-digit authenticator code input with the right mobile keyboard and autofill. */
export function CodeField({
  error,
  label = "Code uit je authenticator-app",
}: {
  error?: string;
  label?: string;
}) {
  return (
    <FormField
      id="code"
      label={label}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      className="font-mono tracking-[0.3em]"
      error={error}
    />
  );
}
