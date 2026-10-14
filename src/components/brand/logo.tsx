import Link from "next/link";
import { cn } from "@/lib/utils";

/** The "SE" mark from the brand kit (paths unchanged, cropped to its bounds). */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="45 54 240 136"
      aria-hidden="true"
      focusable="false"
      className={cn("fill-primary", className)}
    >
      <path d="M174 54H87c-24 0-40 15-40 36s15 35 41 35h36c12 0 18 6 18 15 0 9-7 15-19 15H45v25h83c26 0 43-16 43-39 0-24-16-39-44-39H92c-12 0-18-5-18-14 0-9 6-14 18-14h82z" />
      <path d="M187 81h98l-17 26h-81zM187 123h81l-17 25h-64zM187 165h98l-17 25h-81z" />
    </svg>
  );
}

// The wordmark is real text in Montserrat (loaded by next/font) instead of SVG
// <text>, which cannot use web fonts when an SVG is shown as an image.
function Wordmark({ stacked }: { stacked: boolean }) {
  return (
    <span className={cn("flex flex-col leading-none", stacked && "items-center")}>
      <span
        className={cn(
          "font-heading font-extrabold tracking-[0.12em] text-foreground",
          stacked ? "text-3xl" : "text-[1.05rem]",
        )}
      >
        SKYLINE
      </span>
      <span
        className={cn(
          "font-heading font-semibold tracking-[0.42em] text-primary",
          stacked ? "mt-2 text-[0.7rem]" : "mt-1 text-[0.5rem]",
        )}
      >
        ENTERTAINMENT
      </span>
    </span>
  );
}

export function Logo({
  href = "/",
  variant = "horizontal",
  className,
}: {
  href?: string | null;
  variant?: "horizontal" | "stacked";
  className?: string;
}) {
  const stacked = variant === "stacked";
  const content = (
    <>
      <BrandMark className={stacked ? "h-14 w-auto" : "h-7 w-auto"} />
      <Wordmark stacked={stacked} />
    </>
  );
  const classes = cn(
    "inline-flex shrink-0",
    stacked ? "flex-col items-center gap-4" : "items-center gap-2.5",
    className,
  );

  if (href === null) {
    return (
      <span role="img" aria-label="Skyline Entertainment" className={classes}>
        {content}
      </span>
    );
  }
  return (
    <Link href={href} aria-label="Skyline Entertainment" className={cn(classes, "rounded-md")}>
      {content}
    </Link>
  );
}
