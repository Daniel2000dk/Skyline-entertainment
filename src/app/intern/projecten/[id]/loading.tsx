import { Skeleton } from "@/components/ui/skeleton";

/** Tab switches keep the project header and only show this for the tab content. */
export default function ProjectTabLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <span className="sr-only">Laden…</span>
      <Skeleton className="h-32" />
      <Skeleton className="h-56" />
    </div>
  );
}
