import type { Database } from "@/lib/supabase/database.types";

type Enums = Database["public"]["Enums"];
export type ProjectStatus = Enums["project_status"];
export type ProjectPermission = Enums["project_permission"];
export type RegistrationMode = Enums["registration_mode"];
export type TaskPriority = Enums["task_priority"];
export type TaskStatus = Enums["task_status"];

export const PROJECT_STATUSES = [
  "idea",
  "under_review",
  "approved",
  "in_preparation",
  "published",
  "completed",
  "archived",
  "cancelled",
] as const satisfies readonly ProjectStatus[];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  idea: "Idee",
  under_review: "In bespreking",
  approved: "Goedgekeurd",
  in_preparation: "In voorbereiding",
  published: "Gepubliceerd",
  completed: "Afgerond",
  archived: "Gearchiveerd",
  cancelled: "Geannuleerd",
};

/** Statuses that count as "still being worked on". */
export const ACTIVE_STATUSES: readonly ProjectStatus[] = [
  "idea",
  "under_review",
  "approved",
  "in_preparation",
  "published",
];

export const PERMISSIONS = ["editor", "commenter"] as const satisfies readonly ProjectPermission[];

export const PERMISSION_LABELS: Record<ProjectPermission, string> = {
  editor: "Mag bewerken",
  commenter: "Mag reageren",
};

export const REGISTRATION_MODES = [
  "closed",
  "open",
  "approval",
] as const satisfies readonly RegistrationMode[];

export const REGISTRATION_MODE_LABELS: Record<RegistrationMode, string> = {
  closed: "Gesloten",
  open: "Open",
  approval: "Open, met goedkeuring",
};

export const TASK_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const satisfies readonly TaskPriority[];

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Laag",
  normal: "Normaal",
  high: "Hoog",
  urgent: "Urgent",
};

export const TASK_STATUSES = [
  "todo",
  "in_progress",
  "done",
] as const satisfies readonly TaskStatus[];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Te doen",
  in_progress: "Bezig",
  done: "Klaar",
};
