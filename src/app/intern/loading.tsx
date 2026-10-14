import { Skeleton } from "@/components/ui/skeleton";

/** Shown instantly on navigation while the page's data loads (the shell stays). */
export default function InternalLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only">Laden…</span>
      <div className="flex flex-col gap-2 border-b pb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
