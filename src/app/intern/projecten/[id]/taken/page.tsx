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
      <TaskBoard
        tasks={tasks}
        editableProjects={editable}
        currentStaffId={staff.id}
        showProject={false}
      />
      {canEdit && (
        <section aria-labelledby="task-add" className="rounded-lg border border-dashed p-4">
          <h2 id="task-add" className="mb-3 font-medium">
            Taak toevoegen
          </h2>
          <TaskForm projectId={project.id} staff={activeStaff} />
        </section>
      )}
    </div>
  );
}
