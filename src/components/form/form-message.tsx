import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "@/lib/forms";

/** Shows the result message of a form action (error or success), if any. */
export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert variant={state.status === "error" ? "destructive" : "success"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}
