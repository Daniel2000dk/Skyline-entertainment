import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** KPI tile: label, value and an optional supporting line. */
export function StatTile({
  label,
  value,
  detail,
  href,
  tone,
}: {
  label: string;
  value: number;
  detail?: ReactNode;
  href?: string;
  tone?: "warning";
}) {
  const body = (
    <>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {new Intl.NumberFormat("nl-NL").format(value)}
      </p>
      {detail && (
        <p
          className={cn(
            "mt-1 text-xs",
            tone === "warning" ? "font-medium text-warning" : "text-muted-foreground",
          )}
        >
          {detail}
        </p>
      )}
    </>
  );
  const className = "block rounded-xl border bg-card p-4 transition-colors";
  return href ? (
    <Link href={href} className={cn(className, "hover:border-primary/50")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
