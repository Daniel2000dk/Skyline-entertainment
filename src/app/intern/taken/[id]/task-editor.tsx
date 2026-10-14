"use client";

import { useActionState, useState } from "react";
import { deleteTask } from "@/app/intern/taken/actions";
import { FormMessage } from "@/components/form/form-message";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleFormState } from "@/lib/forms";
import type { StaffOption } from "@/lib/projects/queries";
import type { TaskDetail } from "@/lib/tasks/queries";

export function TaskEditor({ task, staff }: { task: TaskDetail; staff: StaffOption[] }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteState, remove] = useActionState(deleteTask, idleFormState);

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <TaskForm task={task} staff={staff} onSaved={() => setEditing(false)} />
        <Button variant="ghost" className="self-start" onClick={() => setEditing(false)}>
          Annuleren
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <FormMessage state={deleteState} />
      {confirmDelete ? (
        <form action={remove} className="flex flex-col gap-2">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="projectId" value={task.projectId} />
          <p className="text-sm">Deze taak definitief verwijderen?</p>
          <div className="flex gap-2">
            <SubmitButton variant="destructive">Ja, verwijderen</SubmitButton>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Annuleren
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Taak bewerken
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Verwijderen
          </Button>
        </div>
      )}
    </div>
  );
}
