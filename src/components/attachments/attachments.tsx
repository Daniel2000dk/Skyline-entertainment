"use client";

import Image from "next/image";
import { FileTextIcon, Trash2Icon } from "lucide-react";
import { useActionState } from "react";
import { deleteAttachment, uploadAttachment } from "@/app/intern/bestanden/actions";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { AttachmentView } from "@/lib/attachments/queries";
import { formatDateTime } from "@/lib/datetime";
import { formatFileSize } from "@/lib/files";
import { idleFormState } from "@/lib/forms";

/** File list (with image previews) and upload form for a project or idea. */
export function Attachments({
  owner,
  attachments,
  canUpload,
  currentStaffId,
}: {
  owner: { projectId: string } | { ideaId: string };
  attachments: AttachmentView[];
  canUpload: boolean;
  currentStaffId: string;
}) {
  const [state, upload] = useActionState(uploadAttachment, idleFormState);
  const ownerKey = "projectId" in owner ? owner.projectId : owner.ideaId;

  return (
    <div className="flex flex-col gap-4">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen bestanden.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex flex-col gap-2 rounded-lg border p-3">
              {attachment.isImage ? (
                <a href={`/intern/bestanden/${attachment.id}`} target="_blank" rel="noopener">
                  <Image
                    src={`/intern/bestanden/${attachment.id}`}
                    alt={attachment.fileName}
                    width={400}
                    height={240}
                    unoptimized
                    className="h-40 w-full rounded-md bg-muted object-cover"
                  />
                </a>
              ) : (
                <div className="flex h-16 items-center justify-center rounded-md bg-muted">
                  <FileTextIcon className="size-6 text-muted-foreground" aria-hidden="true" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <a
                    href={`/intern/bestanden/${attachment.id}`}
                    className="block truncate text-sm font-medium underline-offset-4 hover:underline"
                    {...(attachment.isImage
                      ? { target: "_blank", rel: "noopener" }
                      : { download: true })}
                  >
                    {attachment.fileName}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.sizeBytes)} ·{" "}
                    {attachment.uploadedByName ?? "Onbekend"} ·{" "}
                    {formatDateTime(attachment.createdAt)}
                  </p>
                </div>
                {(canUpload || attachment.uploadedById === currentStaffId) && (
                  <form action={deleteAttachment}>
                    <input type="hidden" name="attachmentId" value={attachment.id} />
                    <Button
                      type="submit"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`${attachment.fileName} verwijderen`}
                    >
                      <Trash2Icon aria-hidden="true" />
                    </Button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <form action={upload} className="flex flex-col gap-2">
          {"projectId" in owner ? (
            <input type="hidden" name="projectId" value={owner.projectId} />
          ) : (
            <input type="hidden" name="ideaId" value={owner.ideaId} />
          )}
          <FormMessage state={state} />
          <label htmlFor={`file-${ownerKey}`} className="text-sm font-medium">
            Bestand toevoegen
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={`file-${ownerKey}`}
              name="file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
              aria-describedby={`file-${ownerKey}-hint`}
              aria-invalid={state.fieldErrors?.file ? true : undefined}
            />
            <SubmitButton variant="outline" pendingLabel="Bezig met uploaden…">
              Uploaden
            </SubmitButton>
          </div>
          <p id={`file-${ownerKey}-hint`} className="text-xs text-muted-foreground">
            Afbeeldingen of PDF, maximaal 4 MB.
          </p>
          {state.fieldErrors?.file && (
            <p className="text-sm text-destructive">{state.fieldErrors.file}</p>
          )}
        </form>
      )}
    </div>
  );
}
