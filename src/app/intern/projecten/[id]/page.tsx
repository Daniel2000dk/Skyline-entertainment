import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Checklist } from "@/components/projects/checklist";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/staff";
import {
  getProject,
  listActiveStaff,
  listChecklist,
  listEventTypes,
  projectRights,
} from "@/lib/projects/queries";
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
  const [eventTypes, activeStaff, checklist] = await Promise.all([
    listEventTypes(),
    canManage ? listActiveStaff() : Promise.resolve([]),
    listChecklist(project.id),
  ]);

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
        {canManage && <StatusSection projectId={project.id} status={project.status} />}
        <MembersSection project={project} staff={activeStaff} canManage={canManage} />
        {canManage && <DangerZone projectId={project.id} title={project.title} />}
      </div>
    </div>
  );
}
