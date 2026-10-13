import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, string> = {
  info: "border-info/40 bg-info-surface text-info",
  success: "border-success/40 bg-success-surface text-success",
  warning: "border-warning/40 bg-warning-surface text-warning",
  danger: "border-danger/40 bg-danger-surface text-danger",
};

/** Inline message. Errors are announced immediately (role=alert); others politely. */
export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-md border px-4 py-3 text-sm", tones[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1", "text-foreground/90")}>{children}</div>}
    </div>
  );
}
