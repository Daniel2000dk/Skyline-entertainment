import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Attachments } from "@/components/attachments/attachments";
import { requireStaff } from "@/lib/auth/staff";
import { listAttachments } from "@/lib/attachments/queries";
import { getProject, projectRights } from "@/lib/projects/queries";

export const metadata: Metadata = { title: "Bestanden" };

export default async function ProjectFilesPage({
  params,
}: PageProps<"/intern/projecten/[id]/bestanden">) {
  const staff = await requireStaff();
  const project = await getProject((await params).id);
  if (!project) notFound();

  const { canEdit } = projectRights(staff, project);
  const attachments = await listAttachments({ projectId: project.id });

  return (
    <Attachments
      owner={{ projectId: project.id }}
      attachments={attachments}
      canUpload={canEdit}
      currentStaffId={staff.id}
    />
  );
}
