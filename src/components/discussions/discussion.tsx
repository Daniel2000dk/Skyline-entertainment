"use client";

import { useActionState, useState } from "react";
import { addComment, editComment, removeComment } from "@/app/intern/discussie/actions";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/datetime";
import type { CommentView, Thread } from "@/lib/discussions/queries";
import { idleFormState } from "@/lib/forms";

type Subject = { projectId?: string; taskId?: string; suggestionId?: string };

function CommentForm({
  subject,
  parentId,
  label,
  submitLabel,
  onDone,
}: {
  subject: Subject;
  parentId?: string;
  label: string;
  submitLabel: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(async (prev: typeof idleFormState, formData: FormData) => {
    const result = await addComment(prev, formData);
    if (result.status === "success") onDone?.();
    return result;
  }, idleFormState);
  const fieldId = `comment-${parentId ?? subject.projectId ?? subject.taskId ?? subject.suggestionId}`;

  return (
    <form action={action} className="flex flex-col gap-2">
      {parentId ? (
        <input type="hidden" name="parentId" value={parentId} />
      ) : (
        <>
          {subject.projectId && <input type="hidden" name="projectId" value={subject.projectId} />}
          {subject.taskId && <input type="hidden" name="taskId" value={subject.taskId} />}
          {subject.suggestionId && (
            <input type="hidden" name="suggestionId" value={subject.suggestionId} />
          )}
        </>
      )}
      <FormMessage state={state} />
      <label htmlFor={fieldId} className="sr-only">
        {label}
      </label>
      <Textarea
        id={fieldId}
        name="body"
        rows={2}
        maxLength={5000}
        placeholder={label}
        aria-invalid={state.fieldErrors?.body ? true : undefined}
      />
      {state.fieldErrors?.body && (
        <p className="text-sm text-destructive">{state.fieldErrors.body}</p>
      )}
      <SubmitButton size="sm" className="self-start">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

function CommentItem({
  comment,
  canEdit,
  canRemove,
  onReply,
}: {
  comment: CommentView;
  canEdit: boolean;
  canRemove: boolean;
  onReply?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [state, action] = useActionState(async (prev: typeof idleFormState, formData: FormData) => {
    const result = await editComment(prev, formData);
    if (result.status === "success") setEditing(false);
    return result;
  }, idleFormState);

  return (
    <article className="flex flex-col gap-1" aria-label={`Bericht van ${comment.authorName}`}>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{comment.authorName}</span> ·{" "}
        {formatDateTime(comment.createdAt)}
        {comment.edited && comment.body !== null && " · bewerkt"}
      </p>
      {comment.body === null ? (
        <p className="text-sm text-muted-foreground italic">Dit bericht is verwijderd.</p>
      ) : editing ? (
        <form action={action} className="flex flex-col gap-2">
          <input type="hidden" name="commentId" value={comment.id} />
          <FormMessage state={state} />
          <label htmlFor={`edit-${comment.id}`} className="sr-only">
            Bericht bewerken
          </label>
          <Textarea
            id={`edit-${comment.id}`}
            name="body"
            rows={2}
            maxLength={5000}
            defaultValue={comment.body}
          />
          <div className="flex gap-2">
            <SubmitButton size="sm">Opslaan</SubmitButton>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Annuleren
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm break-words whitespace-pre-line">{comment.body}</p>
      )}
      {comment.body !== null && !editing && (
        <div className="flex flex-wrap gap-1">
          {onReply && (
            <Button size="xs" variant="ghost" onClick={onReply}>
              Reageren
            </Button>
          )}
          {canEdit && (
            <Button size="xs" variant="ghost" onClick={() => setEditing(true)}>
              Bewerken
            </Button>
          )}
          {canRemove &&
            (confirmRemove ? (
              <form action={removeComment} className="flex items-center gap-1">
                <input type="hidden" name="commentId" value={comment.id} />
                <span className="text-xs">Verwijderen?</span>
                <Button type="submit" size="xs" variant="destructive">
                  Ja
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setConfirmRemove(false)}>
                  Nee
                </Button>
              </form>
            ) : (
              <Button size="xs" variant="ghost" onClick={() => setConfirmRemove(true)}>
                Verwijderen
              </Button>
            ))}
        </div>
      )}
    </article>
  );
}

function ThreadItem({
  thread,
  currentStaffId,
  isAdmin,
}: {
  thread: Thread;
  currentStaffId: string;
  isAdmin: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const rights = (comment: CommentView) => ({
    canEdit: comment.authorId === currentStaffId,
    canRemove: comment.authorId === currentStaffId || isAdmin,
  });

  return (
    <li className="flex flex-col gap-3 border-t pt-3 first:border-t-0 first:pt-0">
      <CommentItem comment={thread} {...rights(thread)} onReply={() => setReplying(true)} />
      {(thread.replies.length > 0 || replying) && (
        <ul className="flex flex-col gap-3 border-l-2 border-border pl-4">
          {thread.replies.map((reply) => (
            <li key={reply.id}>
              <CommentItem comment={reply} {...rights(reply)} onReply={() => setReplying(true)} />
            </li>
          ))}
          {replying && (
            <li>
              <CommentForm
                subject={{}}
                parentId={thread.id}
                label={`Reageer op ${thread.authorName}…`}
                submitLabel="Reactie plaatsen"
                onDone={() => setReplying(false)}
              />
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

/** Threaded discussion (one level of replies) for a project, task or suggestion. */
export function Discussion({
  subject,
  threads,
  currentStaffId,
  isAdmin,
  emptyText = "Nog geen berichten. Start het gesprek.",
}: {
  subject: Subject;
  threads: Thread[];
  currentStaffId: string;
  isAdmin: boolean;
  emptyText?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      {threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((thread) => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              currentStaffId={currentStaffId}
              isAdmin={isAdmin}
            />
          ))}
        </ul>
      )}
      <CommentForm subject={subject} label="Schrijf een bericht…" submitLabel="Plaatsen" />
    </div>
  );
}
