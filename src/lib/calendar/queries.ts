import "server-only";
import { requireStaff } from "@/lib/auth/staff";
import { STATUS_LABELS } from "@/lib/projects/labels";
import { createClient } from "@/lib/supabase/server";
import { editableProjectIds } from "@/lib/tasks/queries";

export type CalendarItem = {
  kind: "event" | "task" | "activity";
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  href: string;
  meta: string | null;
  done: boolean;
  /** Event the current user may move (project editor). */
  projectId: string | null;
  canReschedule: boolean;
};

/**
 * Everything with a date between `from` and `to`: event start times, task
 * deadlines and team activities. Derived from the source tables, so the
 * calendar never needs separate input.
 */
export async function listCalendarItems(from: string, to: string): Promise<CalendarItem[]> {
  await requireStaff();
  const supabase = await createClient();
  const [events, tasks, activities, editable] = await Promise.all([
    supabase
      .from("events")
      .select("project_id, starts_at, ends_at, location, project:projects(title, status)")
      .gte("starts_at", from)
      .lt("starts_at", to),
    supabase
      .from("tasks")
      .select(
        "id, title, due_at, status, project:projects(title), assignee:staff_profiles!tasks_assignee_id_fkey(display_name)",
      )
      .gte("due_at", from)
      .lt("due_at", to),
    supabase
      .from("team_activities")
      .select(
        "id, title, starts_at, ends_at, location, responsible:staff_profiles!team_activities_responsible_id_fkey(display_name)",
      )
      .gte("starts_at", from)
      .lt("starts_at", to),
    editableProjectIds(),
  ]);
  if (events.error || tasks.error || activities.error) throw new Error("Kon de agenda niet laden");

  const items: CalendarItem[] = [
    ...events.data
      .filter((row) => row.starts_at && row.project?.status !== "archived")
      .map((row) => ({
        kind: "event" as const,
        id: row.project_id,
        title: row.project?.title ?? "Evenement",
        startsAt: row.starts_at!,
        endsAt: row.ends_at,
        href: `/intern/projecten/${row.project_id}`,
        meta: [row.project && STATUS_LABELS[row.project.status], row.location]
          .filter(Boolean)
          .join(" · "),
        done: row.project?.status === "completed" || row.project?.status === "cancelled",
        projectId: row.project_id,
        canReschedule: editable.has(row.project_id),
      })),
    ...tasks.data.map((row) => ({
      kind: "task" as const,
      id: row.id,
      title: row.title,
      startsAt: row.due_at!,
      endsAt: null,
      href: `/intern/taken/${row.id}`,
      meta: [row.project?.title, row.assignee?.display_name].filter(Boolean).join(" · "),
      done: row.status === "done",
      projectId: null,
      canReschedule: false,
    })),
    ...activities.data.map((row) => ({
      kind: "activity" as const,
      id: row.id,
      title: row.title,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      href: `/intern/planning/activiteiten/${row.id}`,
      meta: [row.location, row.responsible?.display_name].filter(Boolean).join(" · "),
      done: false,
      projectId: null,
      canReschedule: false,
    })),
  ];
  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export type ActivityDetail = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
  createdById: string | null;
  createdByName: string | null;
};

export async function getActivity(id: string): Promise<ActivityDetail | null> {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("team_activities")
    .select(
      `id, title, description, location, starts_at, ends_at, responsible_id, created_by,
       responsible:staff_profiles!team_activities_responsible_id_fkey(display_name),
       creator:staff_profiles!team_activities_created_by_fkey(display_name)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    location: data.location,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    responsibleId: data.responsible_id,
    responsibleName: data.responsible?.display_name ?? null,
    createdById: data.created_by,
    createdByName: data.creator?.display_name ?? null,
  };
}
