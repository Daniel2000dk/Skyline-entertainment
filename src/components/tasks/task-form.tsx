"use client";

import { useActionState } from "react";
import { createTask, updateTask } from "@/app/intern/taken/actions";
import { FormField, SelectField, TextareaField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { isoToLocalInput } from "@/lib/datetime";
import { idleFormState, type FormState } from "@/lib/forms";
import {
  PRIORITY_LABELS,
  TASK_PRIORITIES,
  TASK_STATUS_LABELS,
  TASK_STATUSES,
} from "@/lib/projects/labels";
import type { StaffOption } from "@/lib/projects/queries";
import type { TaskDetail } from "@/lib/tasks/queries";

/** Create (projectId) or edit (task) form. */
export function TaskForm({
  projectId,
  task,
  staff,
  onSaved,
}: {
  projectId?: string;
  task?: TaskDetail;
  staff: StaffOption[];
  onSaved?: () => void;
}) {
  const [state, action] = useActionState(async (prev: FormState, formData: FormData) => {
    const result = await (task ? updateTask : createTask)(prev, formData);
    if (result.status === "success") onSaved?.();
    return result;
  }, idleFormState);
  const v = state.status === "error" ? state.values : undefined;
  const prefix = task ? "task-edit" : "task-new";

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
      {projectId && <input type="hidden" name="projectId" value={projectId} />}
      {task && <input type="hidden" name="taskId" value={task.id} />}
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <FormField
        id={`${prefix}-title`}
        name="title"
        label="Titel"
        required
        maxLength={160}
        defaultValue={v?.title ?? task?.title}
        error={state.fieldErrors?.title}
        className="sm:col-span-2"
      />
      <SelectField
        id={`${prefix}-assignee`}
        name="assigneeId"
        label="Verantwoordelijke"
        options={staff.map((person) => ({ value: person.id, label: person.displayName }))}
        emptyLabel="Nog niemand"
        defaultValue={v?.assigneeId ?? task?.assigneeId ?? ""}
        error={state.fieldErrors?.assigneeId}
      />
      <FormField
        id={`${prefix}-due`}
        name="dueAt"
        label="Deadline"
        hint="Verschijnt automatisch in de planning."
        type="datetime-local"
        defaultValue={v?.dueAt ?? isoToLocalInput(task?.dueAt)}
        error={state.fieldErrors?.dueAt}
      />
      <SelectField
        id={`${prefix}-priority`}
        name="priority"
        label="Prioriteit"
        options={TASK_PRIORITIES.map((priority) => ({
          value: priority,
          label: PRIORITY_LABELS[priority],
        }))}
        defaultValue={v?.priority ?? task?.priority ?? "normal"}
        error={state.fieldErrors?.priority}
      />
      <SelectField
        id={`${prefix}-status`}
        name="status"
        label="Status"
        options={TASK_STATUSES.map((status) => ({
          value: status,
          label: TASK_STATUS_LABELS[status],
        }))}
        defaultValue={v?.status ?? task?.status ?? "todo"}
        error={state.fieldErrors?.status}
      />
      <TextareaField
        id={`${prefix}-description`}
        name="description"
        label="Omschrijving"
        rows={3}
        maxLength={5000}
        defaultValue={v?.description ?? task?.description ?? ""}
        error={state.fieldErrors?.description}
        className="sm:col-span-2"
      />
      <SubmitButton className="self-start sm:col-span-2 sm:justify-self-start">
        {task ? "Taak opslaan" : "Taak toevoegen"}
      </SubmitButton>
    </form>
  );
}
