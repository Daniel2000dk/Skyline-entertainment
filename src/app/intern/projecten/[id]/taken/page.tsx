import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TaskBoard } from "@/components/tasks/task-board";
import { TaskForm } from "@/components/tasks/task-form";
import { requireStaff } from "@/lib/auth/staff";
import { getProject, listActiveStaff, projectRights } from "@/lib/projects/queries";
import { editableProjectIds, listTasks } from "@/lib/tasks/queries";

export const metadata: Metadata = { title: "Taken" };

export default async function ProjectTasksPage({
  params,
}: PageProps<"/intern/projecten/[id]/taken">) {
  const staff = await requireStaff();
  const project = await getProject((await params).id);
  if (!project) notFound();

  const { canEdit } = projectRights(staff, project);
  const [tasks, editable, activeStaff] = await Promise.all([
    listTasks({ scope: "all", projectId: project.id }),
    editableProjectIds(),
    canEdit ? listActiveStaff() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {canEdit && (
        <details id="taak-toevoegen" open className="group rounded-lg border border-dashed p-4">
          <summary className="cursor-pointer font-medium">Taak toevoegen</summary>
          <p className="mt-1 text-sm text-muted-foreground">
            Wijs de taak toe aan een medewerker; met een deadline staat hij ook in de planning.
          </p>
          <div className="mt-4">
            <TaskForm projectId={project.id} staff={activeStaff} />
          </div>
        </details>
      )}
      <TaskBoard
        tasks={tasks}
        editableProjects={editable}
        currentStaffId={staff.id}
        showProject={false}
      />
    </div>
  );
}
