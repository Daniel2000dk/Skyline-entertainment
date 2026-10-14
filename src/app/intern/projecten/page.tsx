import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/auth/staff";
import { formatDateTime } from "@/lib/datetime";
import { PROJECT_STATUSES, STATUS_LABELS, type ProjectStatus } from "@/lib/projects/labels";
import { listProjects, type ProjectFilter } from "@/lib/projects/queries";

export const metadata: Metadata = { title: "Projecten" };

function parseFilter(params: Record<string, string | string[] | undefined>): ProjectFilter {
  const status = typeof params.status === "string" ? params.status : "active";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const validStatus =
    status === "all" ||
    status === "active" ||
    (PROJECT_STATUSES as readonly string[]).includes(status);
  return { status: validStatus ? (status as ProjectStatus | "active" | "all") : "active", q };
}

export default async function ProjectsPage({ searchParams }: PageProps<"/intern/projecten">) {
  const staff = await requireStaff();
  const filter = parseFilter(await searchParams);
  const projects = await listProjects(filter);
  const canCreate = staff.role === "admin" || staff.role === "organizer";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projecten"
        description="Elk evenement heeft een eigen projectruimte."
        actions={
          canCreate && (
            <Link href="/intern/projecten/nieuw" className={buttonVariants()}>
              <PlusIcon aria-hidden="true" />
              Nieuw project
            </Link>
          )
        }
      />

      <form className="flex flex-col gap-3 sm:flex-row" role="search">
        <label htmlFor="q" className="sr-only">
          Zoeken op naam
        </label>
        <Input
          id="q"
          name="q"
          type="search"
          placeholder="Zoeken op naam…"
          defaultValue={filter.q}
        />
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <NativeSelect id="status" name="status" defaultValue={filter.status} className="sm:w-56">
          <NativeSelectOption value="active">Lopende projecten</NativeSelectOption>
          <NativeSelectOption value="all">Alle projecten</NativeSelectOption>
          {PROJECT_STATUSES.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {STATUS_LABELS[status]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Filteren
        </button>
      </form>

      {projects.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>Geen projecten gevonden</EmptyTitle>
            <EmptyDescription>
              {canCreate
                ? "Maak een nieuw project aan of pas het filter aan."
                : "Pas het filter aan of vraag een Event Manager om een project te starten."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Card className="px-4 py-4 transition-colors hover:ring-primary/40 sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Link
                      href={`/intern/projecten/${project.id}`}
                      className="font-semibold underline-offset-4 hover:underline"
                    >
                      {project.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {[
                        project.eventTypeName,
                        project.startsAt && formatDateTime(project.startsAt),
                        project.location,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                    <span>
                      {project.openTasks} open {project.openTasks === 1 ? "taak" : "taken"}
                    </span>
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
