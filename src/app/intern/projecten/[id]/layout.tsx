import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { formatDateTime } from "@/lib/datetime";
import { getProject } from "@/lib/projects/queries";
import { uuidSchema } from "@/lib/validation/projects";
import { ProjectTabs } from "./project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/intern/projecten/[id]">) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/intern/projecten"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Projecten
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <StatusBadge status={project.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {[
            project.eventTypeName,
            formatDateTime(project.event?.startsAt),
            project.ownerName && `Eigenaar: ${project.ownerName}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  );
}
