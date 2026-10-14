"use client";

import { XIcon } from "lucide-react";
import { useActionState } from "react";
import { SelectField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { idleFormState } from "@/lib/forms";
import { PERMISSIONS, PERMISSION_LABELS } from "@/lib/projects/labels";
import type { ProjectDetail, StaffOption } from "@/lib/projects/queries";
import { addMember, removeMember, transferOwnership, updateMember } from "../actions";

function MemberRow({
  projectId,
  member,
  canManage,
}: {
  projectId: string;
  member: ProjectDetail["members"][number];
  canManage: boolean;
}) {
  const [updateState, update] = useActionState(updateMember, idleFormState);
  const [removeState, remove] = useActionState(removeMember, idleFormState);

  return (
    <li className="flex flex-col gap-2 border-t py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">
          {member.displayName}
          {!member.isActive && <span className="text-muted-foreground"> (gedeactiveerd)</span>}
        </p>
        <p className="text-xs text-muted-foreground">{ROLE_LABELS[member.role]}</p>
      </div>
      {canManage ? (
        <div className="flex items-center gap-2">
          <form action={update} className="flex gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="staffId" value={member.staffId} />
            <NativeSelect
              name="permission"
              size="sm"
              defaultValue={member.permission}
              aria-label={`Recht van ${member.displayName}`}
            >
              {PERMISSIONS.map((permission) => (
                <NativeSelectOption key={permission} value={permission}>
                  {PERMISSION_LABELS[permission]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <SubmitButton
              size="sm"
              variant="outline"
              aria-label={`Recht van ${member.displayName} opslaan`}
            >
              Opslaan
            </SubmitButton>
          </form>
          <form action={remove}>
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="staffId" value={member.staffId} />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              aria-label={`${member.displayName} verwijderen uit project`}
            >
              <XIcon aria-hidden="true" />
            </Button>
          </form>
        </div>
      ) : (
        <Badge variant="outline">{PERMISSION_LABELS[member.permission]}</Badge>
      )}
      {(updateState.status === "error" || removeState.status === "error") && (
        <FormMessage state={updateState.status === "error" ? updateState : removeState} />
      )}
    </li>
  );
}

export function MembersSection({
  project,
  staff,
  canManage,
}: {
  project: ProjectDetail;
  staff: StaffOption[];
  canManage: boolean;
}) {
  const [addState, add] = useActionState(addMember, idleFormState);
  const [ownerState, transfer] = useActionState(transferOwnership, idleFormState);
  const memberIds = new Set(project.members.map((member) => member.staffId));
  const candidates = staff.filter(
    (person) => person.id !== project.ownerId && !memberIds.has(person.id),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Team en rechten</h2>
        </CardTitle>
        <CardDescription>
          Iedereen in het team kan dit project bekijken en reageren. Leden met &quot;Mag
          bewerken&quot; passen de inhoud aan; de eigenaar beheert status en rechten.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm">
          <span className="text-muted-foreground">Eigenaar: </span>
          <span className="font-medium">{project.ownerName ?? "Onbekend"}</span>
        </p>

        {project.members.length > 0 ? (
          <ul>
            {project.members.map((member) => (
              <MemberRow
                key={member.staffId}
                projectId={project.id}
                member={member}
                canManage={canManage}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nog geen extra leden.</p>
        )}

        {canManage && candidates.length > 0 && (
          <form
            action={add}
            className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <div className="sm:col-span-3">
              <FormMessage state={addState} />
            </div>
            <SelectField
              id="staffId"
              label="Lid toevoegen"
              options={candidates.map((person) => ({
                value: person.id,
                label: person.displayName,
              }))}
              error={addState.fieldErrors?.staffId}
            />
            <SelectField
              id="permission"
              label="Recht"
              options={PERMISSIONS.map((permission) => ({
                value: permission,
                label: PERMISSION_LABELS[permission],
              }))}
              defaultValue="editor"
            />
            <SubmitButton variant="outline">Toevoegen</SubmitButton>
          </form>
        )}

        {canManage && (
          <form
            action={transfer}
            className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <div className="sm:col-span-2">
              <FormMessage state={ownerState} />
            </div>
            <SelectField
              id="ownerId"
              label="Eigenaar wijzigen"
              hint="De nieuwe eigenaar krijgt het beheer; jij houdt je eigen rechten via je rol of lidmaatschap."
              options={staff.map((person) => ({ value: person.id, label: person.displayName }))}
              defaultValue={project.ownerId}
            />
            <SubmitButton variant="outline">Overdragen</SubmitButton>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
