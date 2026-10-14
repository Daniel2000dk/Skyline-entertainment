import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Checklist } from "@/components/projects/checklist";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/staff";
import { getIdeaForProject } from "@/lib/ideas/queries";
import {
  getProject,
  listActiveStaff,
  listChecklist,
  listEventTypes,
  projectRights,
} from "@/lib/projects/queries";
import { listTasks } from "@/lib/tasks/queries";
import { DangerZone } from "./_components/danger-zone";
import { DetailsSection } from "./_components/details-section";
import { MembersSection } from "./_components/members-section";
import { StatusSection } from "./_components/status-section";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectOverviewPage({ params }: PageProps<"/intern/projecten/[id]">) {
  const staff = await requireStaff();
  const project = await getProject((await params).id);
  if (!project) notFound();

  const { canEdit, canManage } = projectRights(staff, project);
  const [eventTypes, activeStaff, checklist, originIdea, tasks] = await Promise.all([
    listEventTypes(),
    canManage ? listActiveStaff() : Promise.resolve([]),
    listChecklist(project.id),
    getIdeaForProject(project.id),
    listTasks({ scope: "all", projectId: project.id }),
  ]);
  const openTasks = tasks.filter((task) => task.status !== "done");
  const overdueTasks = openTasks.filter((task) => task.overdue).length;
  const tasksHref = `/intern/projecten/${project.id}/taken`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="flex flex-col gap-6">
        <DetailsSection project={project} eventTypes={eventTypes} canEdit={canEdit} />
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Checklist</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Checklist
              projectId={project.id}
              items={checklist}
              canTick={canEdit}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </div>
      <div className="flex flex-col gap-6">
        {originIdea && (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Ontstaan uit een idee</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Link
                href={`/intern/ideeen/${originIdea.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {originIdea.title}
              </Link>
              <p className="mt-1 text-muted-foreground">
                De oorspronkelijke discussie staat bij het idee.
              </p>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Taken</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              {openTasks.length} open van {tasks.length}
              {overdueTasks > 0 && (
                <span className="text-destructive"> · {overdueTasks} te laat</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Link href={`${tasksHref}#taak-toevoegen`} className={buttonVariants()}>
                  Taak toevoegen
                </Link>
              )}
              <Link href={tasksHref} className={buttonVariants({ variant: "outline" })}>
                Alle taken
              </Link>
            </div>
          </CardContent>
        </Card>
        {canManage && <StatusSection projectId={project.id} status={project.status} />}
        <MembersSection project={project} staff={activeStaff} canManage={canManage} />
        {canManage && <DangerZone projectId={project.id} title={project.title} />}
      </div>
    </div>
  );
}
