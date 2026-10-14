import "server-only";
import { requireStaff } from "@/lib/auth/staff";
import type { ProjectStatus } from "@/lib/projects/labels";
import { createClient } from "@/lib/supabase/server";
import { describeActivity, type ActivityEntry } from "./activity";
import type { Period } from "./period";

export type DashboardFigures = {
  eventsHeld: number;
  eventsInPeriod: number;
  upcomingEvents: number;
  openTasks: number;
  overdueTasks: number;
  myOpenTasks: number;
  tasksCompleted: number;
  openIdeas: number;
  /** One entry per period bucket, zero-filled. */
  eventsPerBucket: Array<{ bucket: string; count: number }>;
};

export async function getDashboardFigures(period: Period): Promise<DashboardFigures> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dashboard_summary", {
    p_from: period.from,
    p_to: period.to,
    p_granularity: period.granularity,
  });
  if (error || !data) throw new Error("Kon het dashboard niet laden");

  const summary = data as Record<string, unknown>;
  const counts = new Map(
    ((summary.events_per_bucket as Array<{ bucket: string; count: number }>) ?? []).map((row) => [
      row.bucket,
      Number(row.count),
    ]),
  );
  const n = (key: string) => Number(summary[key] ?? 0);
  return {
    eventsHeld: n("events_held"),
    eventsInPeriod: n("events_in_period"),
    upcomingEvents: n("upcoming_events"),
    openTasks: n("open_tasks"),
    overdueTasks: n("overdue_tasks"),
    myOpenTasks: n("my_open_tasks"),
    tasksCompleted: n("tasks_completed"),
    openIdeas: n("open_ideas"),
    eventsPerBucket: period.buckets.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 })),
  };
}

export type UpcomingEvent = {
  projectId: string;
  title: string;
  startsAt: string;
  status: ProjectStatus;
  location: string | null;
};

export async function listUpcomingEvents(limit = 5): Promise<UpcomingEvent[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("project_id, starts_at, location, project:projects!inner(title, status)")
    .gte("starts_at", new Date().toISOString())
    // Same statuses as the "Komende evenementen" figure.
    .in("project.status", ["approved", "in_preparation", "published"])
    .order("starts_at")
    .limit(limit);
  if (error) throw new Error("Kon komende evenementen niet laden");
  return data.map((row) => ({
    projectId: row.project_id,
    title: row.project.title,
    startsAt: row.starts_at!,
    status: row.project.status,
    location: row.location,
  }));
}

export type RecentActivity = {
  id: number;
  description: string;
  actorName: string;
  projectId: string | null;
  projectTitle: string | null;
  occurredAt: string;
};

/** Latest project activity (all staff may see project history). */
export async function listRecentActivity(limit = 10): Promise<RecentActivity[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, details, actor_id, project_id, occurred_at")
    .not("project_id", "is", null)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Kon recente activiteit niet laden");

  const actorIds = [...new Set(data.map((row) => row.actor_id).filter(Boolean))] as string[];
  const projectIds = [...new Set(data.map((row) => row.project_id).filter(Boolean))] as string[];
  const [actors, projects] = await Promise.all([
    actorIds.length
      ? supabase.from("staff_profiles").select("id, display_name").in("id", actorIds)
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string }> }),
    projectIds.length
      ? supabase.from("projects").select("id, title").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
  ]);
  const actorNames = new Map((actors.data ?? []).map((row) => [row.id, row.display_name]));
  const projectTitles = new Map((projects.data ?? []).map((row) => [row.id, row.title]));

  return data.map((row) => ({
    id: row.id,
    description: describeActivity(row as ActivityEntry),
    actorName: row.actor_id ? (actorNames.get(row.actor_id) ?? "Onbekend") : "Systeem",
    projectId: row.project_id && projectTitles.has(row.project_id) ? row.project_id : null,
    projectTitle: row.project_id
      ? (projectTitles.get(row.project_id) ?? "Verwijderd project")
      : null,
    occurredAt: row.occurred_at,
  }));
}
