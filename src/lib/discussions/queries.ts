import "server-only";
import { requireStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import type { SuggestionField } from "@/lib/validation/discussions";

export type DiscussionSubject =
  { projectId: string } | { taskId: string } | { suggestionId: string } | { ideaId: string };

export type CommentView = {
  id: string;
  authorId: string | null;
  authorName: string;
  body: string | null; // null when removed
  createdAt: string;
  edited: boolean;
};

export type Thread = CommentView & { replies: CommentView[] };

type CommentRow = {
  id: string;
  parent_id: string | null;
  author_id: string | null;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  author: { display_name: string } | null;
};

const COMMENT_COLUMNS =
  "id, parent_id, author_id, body, created_at, edited_at, deleted_at, project_id, task_id, suggestion_id, idea_id, author:staff_profiles!comments_author_id_fkey(display_name)";

function toView(row: CommentRow): CommentView {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author?.display_name ?? "Onbekend",
    // Removed messages keep their place in the thread without their text.
    body: row.deleted_at ? null : row.body,
    createdAt: row.created_at,
    edited: Boolean(row.edited_at),
  };
}

export function buildThreads(rows: CommentRow[]): Thread[] {
  const threads = new Map<string, Thread>();
  for (const row of rows) if (!row.parent_id) threads.set(row.id, { ...toView(row), replies: [] });
  for (const row of rows) {
    if (row.parent_id) threads.get(row.parent_id)?.replies.push(toView(row));
  }
  return [...threads.values()];
}

export async function listThreads(subject: DiscussionSubject): Promise<Thread[]> {
  await requireStaff();
  const supabase = await createClient();
  let query = supabase.from("comments").select(COMMENT_COLUMNS).order("created_at").limit(500);
  if ("projectId" in subject) query = query.eq("project_id", subject.projectId);
  else if ("taskId" in subject) query = query.eq("task_id", subject.taskId);
  else if ("suggestionId" in subject) query = query.eq("suggestion_id", subject.suggestionId);
  else query = query.eq("idea_id", subject.ideaId);
  const { data, error } = await query;
  if (error) throw new Error("Kon de discussie niet laden");
  return buildThreads(data as CommentRow[]);
}

export type SuggestionView = {
  id: string;
  field: SuggestionField | null;
  proposedValue: string | null;
  message: string;
  status: "open" | "accepted" | "rejected" | "withdrawn";
  authorId: string | null;
  authorName: string;
  createdAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  threads: Thread[];
};

export async function listSuggestions(projectId: string): Promise<SuggestionView[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suggestions")
    .select(
      `id, field, proposed_value, message, status, author_id, created_at, decided_at, decision_note,
       author:staff_profiles!suggestions_author_id_fkey(display_name),
       decider:staff_profiles!suggestions_decided_by_fkey(display_name)`,
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Kon suggesties niet laden");

  const ids = data.map((row) => row.id);
  const { data: comments } = ids.length
    ? await supabase
        .from("comments")
        .select(COMMENT_COLUMNS)
        .in("suggestion_id", ids)
        .order("created_at")
    : { data: [] };

  return (
    data
      .map((row) => ({
        id: row.id,
        field: row.field as SuggestionField | null,
        proposedValue: row.proposed_value,
        message: row.message,
        status: row.status,
        authorId: row.author_id,
        authorName: row.author?.display_name ?? "Onbekend",
        createdAt: row.created_at,
        decidedByName: row.decider?.display_name ?? null,
        decidedAt: row.decided_at,
        decisionNote: row.decision_note,
        threads: buildThreads(
          ((comments ?? []) as Array<CommentRow & { suggestion_id: string | null }>).filter(
            (comment) => comment.suggestion_id === row.id,
          ),
        ),
      }))
      // Open suggestions first, newest first within each group.
      .sort((a, b) => Number(b.status === "open") - Number(a.status === "open"))
  );
}
