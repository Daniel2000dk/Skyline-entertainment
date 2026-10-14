import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { moveTask } from "@/app/intern/taken/actions";
import { Checklist } from "@/components/projects/checklist";
import { DueLabel, PriorityBadge } from "@/components/tasks/task-board";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/staff";
import { formatDateTime } from "@/lib/datetime";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/projects/labels";
import { listActiveStaff, listChecklist } from "@/lib/projects/queries";
import { editableProjectIds, getTask } from "@/lib/tasks/queries";
import { uuidSchema } from "@/lib/validation/projects";
import { TaskEditor } from "./task-editor";

export const metadata: Metadata = { title: "Taak" };

export default async function TaskPage({ params }: PageProps<"/intern/taken/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const task = await getTask(id);
  if (!task) notFound();

  const editable = await editableProjectIds();
  const canEdit = editable.has(task.projectId);
  const isAssignee = task.assigneeId === staff.id;
  const [checklist, activeStaff] = await Promise.all([
    listChecklist(task.projectId, task.id),
    canEdit ? listActiveStaff() : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/intern/projecten/${task.projectId}/taken`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {task.projectTitle}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
          <Badge variant="outline">{TASK_STATUS_LABELS[task.status]}</Badge>
          <PriorityBadge priority={task.priority} />
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>Verantwoordelijke: {task.assigneeName ?? "nog niemand"}</span>
          <DueLabel dueAt={task.dueAt} overdue={task.overdue} />
          {task.completedAt && <span>Afgerond: {formatDateTime(task.completedAt)}</span>}
        </p>
      </div>

      {(canEdit || isAssignee) && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Status wijzigen">
          {TASK_STATUSES.filter((status) => status !== task.status).map((status) => (
            <form key={status} action={moveTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value={status} />
              <Button type="submit" variant={status === "done" ? "default" : "outline"}>
                Naar &quot;{TASK_STATUS_LABELS[status]}&quot;
              </Button>
            </form>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Omschrijving</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm whitespace-pre-line">
              {task.description || "Geen omschrijving."}
            </p>
            <p className="text-xs text-muted-foreground">
              Aangemaakt {formatDateTime(task.createdAt)}
              {task.createdByName && ` door ${task.createdByName}`}
            </p>
            {canEdit && <TaskEditor task={task} staff={activeStaff} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Checklist</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Checklist
              projectId={task.projectId}
              taskId={task.id}
              items={checklist}
              canTick={canEdit || isAssignee}
              canEdit={canEdit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
