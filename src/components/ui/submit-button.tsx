"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

/** Submit button that shows a pending state while its parent form's action runs. */
export function SubmitButton(props: Omit<ComponentProps<typeof Button>, "type" | "pending">) {
  const { pending } = useFormStatus();
  return <Button type="submit" pending={pending} {...props} />;
}
