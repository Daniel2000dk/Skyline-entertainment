import "server-only";
import { cache } from "react";
import { requireStaff } from "@/lib/auth/staff";
import type { TaskPriority, TaskStatus } from "@/lib/projects/labels";
import { createClient } from "@/lib/supabase/server";

export type TaskCard = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: string | null;
  /** Past its deadline and not done (computed at request time). */
  overdue: boolean;
  projectId: string;
  projectTitle: string;
  assigneeId: string | null;
  assigneeName: string | null;
  checklistDone: number;
  checklistTotal: number;
};

const PRIORITY_ORDER: Record<TaskPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

/** Earliest deadline first, then priority; tasks without deadline last. */
export function compareTasks(a: Pick<TaskCard, "dueAt" | "priority" | "title">, b: typeof a) {
  if (a.dueAt !== b.dueAt) {
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return a.dueAt.localeCompare(b.dueAt);
  }
  return (
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.title.localeCompare(b.title, "nl")
  );
}

const DONE_VISIBLE_DAYS = 14;

function isOverdue(dueAt: string | null, status: TaskStatus) {
  return status !== "done" && dueAt !== null && new Date(dueAt).getTime() < Date.now();
}

export async function listTasks(filter: {
  scope: "mine" | "all";
  projectId?: string;
}): Promise<TaskCard[]> {
  const staff = await requireStaff();
  const supabase = await createClient();
  const doneSince = new Date(Date.now() - DONE_VISIBLE_DAYS * 86_400_000).toISOString();

  let query = supabase
    .from("tasks")
    .select(
      `id, title, status, priority, due_at, project_id, assignee_id,
       project:projects(title),
       assignee:staff_profiles!tasks_assignee_id_fkey(display_name),
       checklist:checklist_items(is_done)`,
    )
    // Finished tasks stay visible for two weeks, then only in the project.
    .or(`status.neq.done,completed_at.gte.${doneSince}`)
    .limit(500);
  if (filter.scope === "mine") query = query.eq("assignee_id", staff.id);
  if (filter.projectId) query = query.eq("project_id", filter.projectId);

  const { data, error } = await query;
  if (error) throw new Error("Kon taken niet laden");
  return data
    .map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      dueAt: row.due_at,
      overdue: isOverdue(row.due_at, row.status),
      projectId: row.project_id,
      projectTitle: row.project?.title ?? "",
      assigneeId: row.assignee_id,
      assigneeName: row.assignee?.display_name ?? null,
      checklistDone: row.checklist.filter((item) => item.is_done).length,
      checklistTotal: row.checklist.length,
    }))
    .sort(compareTasks);
}

/** Projects the current staff member may edit (mirrors the RLS rule). */
export const editableProjectIds = cache(async (): Promise<Set<string>> => {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_editable_project_ids");
  return new Set(data ?? []);
});

export type TaskDetail = TaskCard & {
  description: string | null;
  createdByName: string | null;
  createdAt: string;
  completedAt: string | null;
};

export async function getTask(id: string): Promise<TaskDetail | null> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(
      `id, title, description, status, priority, due_at, project_id, assignee_id, created_at, completed_at,
       project:projects(title),
       assignee:staff_profiles!tasks_assignee_id_fkey(display_name),
       created_by_profile:staff_profiles!tasks_created_by_fkey(display_name),
       checklist:checklist_items(is_done)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    dueAt: data.due_at,
    overdue: isOverdue(data.due_at, data.status),
    projectId: data.project_id,
    projectTitle: data.project?.title ?? "",
    assigneeId: data.assignee_id,
    assigneeName: data.assignee?.display_name ?? null,
    createdByName: data.created_by_profile?.display_name ?? null,
    createdAt: data.created_at,
    completedAt: data.completed_at,
    checklistDone: data.checklist.filter((item) => item.is_done).length,
    checklistTotal: data.checklist.length,
  };
}
