import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/staff";
import { getProject, listActiveStaff, listRunbook, projectRights } from "@/lib/projects/queries";
import { RunbookEditor } from "./runbook-editor";

export const metadata: Metadata = { title: "Draaiboek" };

export default async function RunbookPage({
  params,
}: PageProps<"/intern/projecten/[id]/draaiboek">) {
  const staff = await requireStaff();
  const project = await getProject((await params).id);
  if (!project) notFound();

  const { canEdit } = projectRights(staff, project);
  const [items, activeStaff] = await Promise.all([
    listRunbook(project.id),
    canEdit ? listActiveStaff() : Promise.resolve([]),
  ]);

  return (
    <RunbookEditor projectId={project.id} items={items} staff={activeStaff} canEdit={canEdit} />
  );
}
