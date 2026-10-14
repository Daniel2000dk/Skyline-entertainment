import "server-only";
import { cache } from "react";
import type { StaffRole } from "@/lib/auth/roles";
import { requireStaff, type CurrentStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import {
  ACTIVE_STATUSES,
  type ProjectPermission,
  type ProjectStatus,
  type RegistrationMode,
} from "./labels";

export type ProjectListItem = {
  id: string;
  title: string;
  status: ProjectStatus;
  eventTypeName: string | null;
  ownerName: string | null;
  startsAt: string | null;
  location: string | null;
  openTasks: number;
};

export type ProjectFilter = { status: ProjectStatus | "active" | "all"; q: string };

/** Escapes LIKE wildcards so a search for "50%" stays literal. */
function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export async function listProjects(filter: ProjectFilter): Promise<ProjectListItem[]> {
  await requireStaff();
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select(
      `id, title, status, created_at,
       owner:staff_profiles!projects_owner_id_fkey(display_name),
       event_type:event_types(name),
       event:events(starts_at, location),
       open_tasks:tasks(count)`,
    )
    .neq("open_tasks.status", "done")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter.status === "active") query = query.in("status", [...ACTIVE_STATUSES]);
  else if (filter.status !== "all") query = query.eq("status", filter.status);
  if (filter.q) query = query.ilike("title", likePattern(filter.q));

  const { data, error } = await query;
  if (error) throw new Error("Kon projecten niet laden");

  const items = data.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    eventTypeName: row.event_type?.name ?? null,
    ownerName: row.owner?.display_name ?? null,
    startsAt: row.event?.starts_at ?? null,
    location: row.event?.location ?? null,
    openTasks: row.open_tasks[0]?.count ?? 0,
  }));

  // Planned events first (soonest first), unplanned ones after.
  return items.sort((a, b) => {
    if (a.startsAt && b.startsAt) return a.startsAt.localeCompare(b.startsAt);
    if (a.startsAt) return -1;
    if (b.startsAt) return 1;
    return 0;
  });
}

export type ProjectMember = {
  staffId: string;
  displayName: string;
  role: StaffRole;
  isActive: boolean;
  permission: ProjectPermission;
};

export type ProjectDetail = {
  id: string;
  title: string;
  status: ProjectStatus;
  description: string | null;
  budget: number;
  ownerId: string;
  ownerName: string | null;
  eventTypeId: string | null;
  eventTypeName: string | null;
  createdAt: string;
  event: {
    id: string;
    slug: string;
    summary: string | null;
    description: string | null;
    rules: string | null;
    location: string | null;
    startsAt: string | null;
    endsAt: string | null;
    capacity: number | null;
    entryFee: number;
    registrationMode: RegistrationMode;
  } | null;
  members: ProjectMember[];
};

/** Cached per request: the project layout and its pages share one query. */
export const getProject = cache(async (id: string): Promise<ProjectDetail | null> => {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(
      `id, title, status, description, budget_gta, owner_id, event_type_id, created_at,
       owner:staff_profiles!projects_owner_id_fkey(display_name),
       event_type:event_types(name),
       event:events(id, slug, summary, description, rules, location, starts_at, ends_at,
                    capacity, entry_fee_gta, registration_mode),
       members:project_members(permission,
         staff:staff_profiles!project_members_staff_id_fkey(id, display_name, role, is_active))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  const event = data.event;
  return {
    id: data.id,
    title: data.title,
    status: data.status,
    description: data.description,
    budget: data.budget_gta,
    ownerId: data.owner_id,
    ownerName: data.owner?.display_name ?? null,
    eventTypeId: data.event_type_id,
    eventTypeName: data.event_type?.name ?? null,
    createdAt: data.created_at,
    event: event
      ? {
          id: event.id,
          slug: event.slug,
          summary: event.summary,
          description: event.description,
          rules: event.rules,
          location: event.location,
          startsAt: event.starts_at,
          endsAt: event.ends_at,
          capacity: event.capacity,
          entryFee: event.entry_fee_gta,
          registrationMode: event.registration_mode,
        }
      : null,
    members: data.members
      .filter((member) => member.staff)
      .map((member) => ({
        staffId: member.staff!.id,
        displayName: member.staff!.display_name,
        role: member.staff!.role,
        isActive: member.staff!.is_active,
        permission: member.permission,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "nl")),
  };
});

/**
 * UI hints mirroring private.can_edit_project / can_manage_project. The
 * database enforces the real rules; these only decide what to show.
 */
export function projectRights(
  staff: CurrentStaff,
  project: Pick<ProjectDetail, "ownerId" | "members">,
) {
  const canManage = staff.role === "admin" || project.ownerId === staff.id;
  const canEdit =
    canManage ||
    project.members.some((member) => member.staffId === staff.id && member.permission === "editor");
  return { canEdit, canManage };
}

export type StaffOption = { id: string; displayName: string; role: StaffRole };

export async function listActiveStaff(): Promise<StaffOption[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("id, display_name, role")
    .eq("is_active", true)
    .order("display_name");
  if (error) throw new Error("Kon medewerkers niet laden");
  return data.map((row) => ({ id: row.id, displayName: row.display_name, role: row.role }));
}

export type EventTypeOption = { id: string; name: string };

export async function listEventTypes(): Promise<EventTypeOption[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_types")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error("Kon evenementtypen niet laden");
  return data;
}

export type ChecklistItem = {
  id: string;
  title: string;
  isDone: boolean;
  doneByName: string | null;
  doneAt: string | null;
};

export async function listChecklist(projectId: string, taskId: string | null = null) {
  await requireStaff();
  const supabase = await createClient();
  let query = supabase
    .from("checklist_items")
    .select(
      "id, title, is_done, done_at, done_by:staff_profiles!checklist_items_done_by_fkey(display_name)",
    )
    .eq("project_id", projectId)
    .order("position")
    .order("created_at");
  query = taskId ? query.eq("task_id", taskId) : query.is("task_id", null);
  const { data, error } = await query;
  if (error) throw new Error("Kon de checklist niet laden");
  return data.map((row): ChecklistItem => ({
    id: row.id,
    title: row.title,
    isDone: row.is_done,
    doneByName: row.done_by?.display_name ?? null,
    doneAt: row.done_at,
  }));
}

export type RunbookItem = {
  id: string;
  title: string;
  details: string | null;
  startsAt: string | null;
  responsibleId: string | null;
  responsibleName: string | null;
};

export async function listRunbook(projectId: string): Promise<RunbookItem[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("runbook_items")
    .select(
      `id, title, details, starts_at, responsible_id,
       responsible:staff_profiles!runbook_items_responsible_id_fkey(display_name)`,
    )
    .eq("project_id", projectId)
    .order("starts_at", { nullsFirst: false })
    .order("position")
    .order("created_at");
  if (error) throw new Error("Kon het draaiboek niet laden");
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    details: row.details,
    startsAt: row.starts_at,
    responsibleId: row.responsible_id,
    responsibleName: row.responsible?.display_name ?? null,
  }));
}

export type Revision = {
  id: number;
  entity: "project" | "event";
  changedColumns: string[];
  previous: Record<string, unknown>;
  changedByName: string | null;
  changedAt: string;
};

export async function listRevisions(projectId: string): Promise<Revision[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_revisions")
    .select("id, entity, changed_columns, previous, changed_by, changed_at")
    .eq("project_id", projectId)
    .order("id", { ascending: false })
    .limit(100);
  if (error) throw new Error("Kon de geschiedenis niet laden");

  const staffIds = [...new Set(data.map((row) => row.changed_by).filter(Boolean))] as string[];
  const names = new Map<string, string>();
  if (staffIds.length) {
    const { data: staff } = await supabase
      .from("staff_profiles")
      .select("id, display_name")
      .in("id", staffIds);
    for (const person of staff ?? []) names.set(person.id, person.display_name);
  }

  return data.map((row) => ({
    id: row.id,
    entity: row.entity as "project" | "event",
    changedColumns: row.changed_columns,
    previous: (row.previous ?? {}) as Record<string, unknown>,
    changedByName: row.changed_by ? (names.get(row.changed_by) ?? "Onbekend") : "Systeem",
    changedAt: row.changed_at,
  }));
}
