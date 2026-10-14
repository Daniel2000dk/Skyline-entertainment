"use client";

import { useActionState, useState } from "react";
import { deleteActivity } from "@/app/intern/planning/actions";
import { ActivityForm } from "@/components/calendar/activity-form";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActivityDetail } from "@/lib/calendar/queries";
import { idleFormState } from "@/lib/forms";
import type { StaffOption } from "@/lib/projects/queries";

export function ActivityEditor({
  activity,
  staff,
}: {
  activity: ActivityDetail;
  staff: StaffOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [state, remove] = useActionState(deleteActivity, idleFormState);

  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <ActivityForm activity={activity} staff={staff} onSaved={() => setEditing(false)} />
        <Button variant="ghost" className="self-start" onClick={() => setEditing(false)}>
          Annuleren
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <FormMessage state={state} />
      {confirmDelete ? (
        <form action={remove} className="flex flex-col gap-2">
          <input type="hidden" name="activityId" value={activity.id} />
          <p>Deze activiteit verwijderen?</p>
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
            Bewerken
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Verwijderen
          </Button>
        </div>
      )}
    </div>
  );
}
