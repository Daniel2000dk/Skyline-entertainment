import Link from "next/link";
import { moveTask } from "@/app/intern/taken/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/datetime";
import {
  PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/projects/labels";
import type { TaskCard } from "@/lib/tasks/queries";
import { cn } from "@/lib/utils";

const MOVES: Record<TaskStatus, Array<{ to: TaskStatus; label: string }>> = {
  todo: [{ to: "in_progress", label: "Starten" }],
  in_progress: [
    { to: "done", label: "Klaar" },
    { to: "todo", label: "Terug" },
  ],
  done: [{ to: "todo", label: "Heropenen" }],
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "normal") return null;
  return (
    <Badge
      variant={priority === "low" ? "outline" : priority === "urgent" ? "destructive" : "secondary"}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}

export function DueLabel({ dueAt, overdue }: { dueAt: string | null; overdue: boolean }) {
  if (!dueAt) return null;
  return (
    <span
      className={cn("text-xs", overdue ? "font-medium text-destructive" : "text-muted-foreground")}
    >
      {overdue ? "Te laat: " : "Deadline: "}
      {formatDate(dueAt)}
    </span>
  );
}

function Card({
  task,
  canMove,
  showProject,
}: {
  task: TaskCard;
  canMove: boolean;
  showProject: boolean;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/intern/taken/${task.id}`}
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          {task.title}
        </Link>
        <PriorityBadge priority={task.priority} />
      </div>
      {showProject && <p className="text-xs text-muted-foreground">{task.projectTitle}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-muted-foreground">
          {task.assigneeName ?? "Niet toegewezen"}
        </span>
        <DueLabel dueAt={task.dueAt} overdue={task.overdue} />
        {task.checklistTotal > 0 && (
          <span className="text-xs text-muted-foreground">
            {task.checklistDone}/{task.checklistTotal} punten
          </span>
        )}
      </div>
      {canMove && (
        <div className="flex gap-2">
          {MOVES[task.status].map((move) => (
            <form key={move.to} action={moveTask}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value={move.to} />
              <Button
                type="submit"
                size="sm"
                variant={move.to === "done" ? "default" : "outline"}
                aria-label={`${task.title}: ${move.label}`}
              >
                {move.label}
              </Button>
            </form>
          ))}
        </div>
      )}
    </li>
  );
}

/** Kanban board: Te doen / Bezig / Klaar. Moving uses buttons (keyboard and screen reader friendly). */
export function TaskBoard({
  tasks,
  editableProjects,
  currentStaffId,
  showProject,
}: {
  tasks: TaskCard[];
  editableProjects: Set<string>;
  currentStaffId: string;
  showProject: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <section
            key={status}
            aria-labelledby={`column-${status}`}
            className="flex flex-col gap-3 rounded-xl bg-muted/40 p-3"
          >
            <h2
              id={`column-${status}`}
              className="flex items-center justify-between text-sm font-semibold"
            >
              {TASK_STATUS_LABELS[status]}
              <span className="text-muted-foreground">{column.length}</span>
            </h2>
            {column.length === 0 ? (
              <p className="text-xs text-muted-foreground">Geen taken.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {column.map((task) => (
                  <Card
                    key={task.id}
                    task={task}
                    showProject={showProject}
                    canMove={
                      editableProjects.has(task.projectId) || task.assigneeId === currentStaffId
                    }
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
