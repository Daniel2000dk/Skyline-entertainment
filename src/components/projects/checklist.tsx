"use client";

import { CheckIcon, Trash2Icon } from "lucide-react";
import { useActionState } from "react";
import {
  addChecklistItem,
  deleteChecklistItem,
  toggleChecklistItem,
} from "@/app/intern/projecten/[id]/actions";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/datetime";
import { idleFormState } from "@/lib/forms";
import type { ChecklistItem } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";

/** Project or task checklist. Ticking is allowed for editors (and task assignees). */
export function Checklist({
  projectId,
  taskId,
  items,
  canTick,
  canEdit,
}: {
  projectId: string;
  taskId?: string;
  items: ChecklistItem[];
  canTick: boolean;
  canEdit: boolean;
}) {
  const [state, add] = useActionState(addChecklistItem, idleFormState);
  const done = items.filter((item) => item.isDone).length;

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {done} van {items.length} afgerond
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            {canTick ? (
              <form action={toggleChecklistItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <input type="hidden" name="done" value={item.isDone ? "false" : "true"} />
                <button
                  type="submit"
                  role="checkbox"
                  aria-checked={item.isDone}
                  aria-label={item.title}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md border border-input transition-colors",
                    item.isDone && "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {item.isDone && <CheckIcon className="size-4" aria-hidden="true" />}
                </button>
              </form>
            ) : (
              <span
                role="img"
                aria-label={item.isDone ? "Afgerond" : "Open"}
                className={cn(
                  "flex size-6 items-center justify-center rounded-md border border-input",
                  item.isDone && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {item.isDone && <CheckIcon className="size-4" aria-hidden="true" />}
              </span>
            )}
            <span
              className={cn("flex-1 text-sm", item.isDone && "text-muted-foreground line-through")}
            >
              {item.title}
              {item.isDone && item.doneByName && (
                <span className="ml-2 text-xs no-underline">
                  ({item.doneByName}, {formatDateTime(item.doneAt)})
                </span>
              )}
            </span>
            {canEdit && (
              <form action={deleteChecklistItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <Button
                  type="submit"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`${item.title} verwijderen`}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && <p className="text-sm text-muted-foreground">Nog geen punten.</p>}

      {canEdit && (
        <form action={add} className="flex flex-col gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          {taskId && <input type="hidden" name="taskId" value={taskId} />}
          <FormMessage state={state} />
          <div className="flex gap-2">
            <label htmlFor={`checklist-${taskId ?? projectId}`} className="sr-only">
              Nieuw punt
            </label>
            <Input
              id={`checklist-${taskId ?? projectId}`}
              name="title"
              placeholder="Nieuw punt…"
              maxLength={200}
              aria-invalid={state.fieldErrors?.title ? true : undefined}
            />
            <SubmitButton variant="outline">Toevoegen</SubmitButton>
          </div>
          {state.fieldErrors?.title && (
            <p className="text-sm text-destructive">{state.fieldErrors.title}</p>
          )}
        </form>
      )}
    </div>
  );
}
