import type { Metadata } from "next";
import Link from "next/link";
import { TaskBoard } from "@/components/tasks/task-board";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/auth/staff";
import { editableProjectIds, listTasks } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Taken" };

export default async function TasksPage({ searchParams }: PageProps<"/intern/taken">) {
  const staff = await requireStaff();
  const scope = (await searchParams).weergave === "alle" ? "all" : "mine";
  const [tasks, editable] = await Promise.all([listTasks({ scope }), editableProjectIds()]);

  const tabs = [
    { scope: "mine", label: "Mijn taken", href: "/intern/taken" },
    { scope: "all", label: "Alle taken", href: "/intern/taken?weergave=alle" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Taken"
        description="Afgeronde taken blijven twee weken zichtbaar; daarna vind je ze in het project."
      />
      <nav aria-label="Weergave" className="flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.scope}
            href={tab.href}
            aria-current={scope === tab.scope ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              scope === tab.scope
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <TaskBoard tasks={tasks} editableProjects={editable} currentStaffId={staff.id} showProject />
    </div>
  );
}
