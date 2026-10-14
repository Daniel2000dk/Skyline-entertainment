import {
  STATUS_LABELS,
  TASK_STATUS_LABELS,
  type ProjectStatus,
  type TaskStatus,
} from "@/lib/projects/labels";

type Diff = Record<string, { from: unknown; to: unknown }>;
export type ActivityEntry = { action: string; details: { diff?: Diff; changed?: string[] } | null };

const SUGGESTION_RESULT: Record<string, string> = {
  accepted: "Suggestie geaccepteerd",
  rejected: "Suggestie afgewezen",
  withdrawn: "Suggestie ingetrokken",
};

/** Human-readable Dutch description of an activity log entry. */
export function describeActivity({ action, details }: ActivityEntry): string {
  const diff = details?.diff ?? {};
  const status = diff.status?.to as string | undefined;
  switch (action) {
    case "projects.insert":
      return "Project aangemaakt";
    case "projects.update":
      if (status) return `Status naar ${STATUS_LABELS[status as ProjectStatus] ?? status}`;
      if (diff.owner_id) return "Eigenaar gewijzigd";
      return "Projectdetails bijgewerkt";
    case "projects.delete":
      return "Project verwijderd";
    case "events.insert":
      return "Evenement aangemaakt";
    case "events.update":
      return "Evenementdetails bijgewerkt";
    case "tasks.insert":
      return "Taak toegevoegd";
    case "tasks.update":
      if (status) return `Taak naar "${TASK_STATUS_LABELS[status as TaskStatus] ?? status}"`;
      if (diff.assignee_id) return "Taak toegewezen";
      return "Taak bijgewerkt";
    case "tasks.delete":
      return "Taak verwijderd";
    case "project_members.insert":
      return "Teamlid toegevoegd";
    case "project_members.update":
      return "Rechten van teamlid gewijzigd";
    case "project_members.delete":
      return "Teamlid verwijderd";
    case "runbook_items.insert":
    case "runbook_items.update":
    case "runbook_items.delete":
      return "Draaiboek bijgewerkt";
    case "suggestions.insert":
      return "Suggestie ingediend";
    case "suggestions.update":
      return (status && SUGGESTION_RESULT[status]) || "Suggestie bijgewerkt";
    case "map_routes.insert":
      return "Route op de kaart gezet";
    case "map_routes.update":
      return "Route bijgewerkt";
    case "map_routes.delete":
      return "Route verwijderd";
    case "map_markers.insert":
      return "Marker geplaatst";
    case "map_markers.update":
      return "Marker bijgewerkt";
    case "map_markers.delete":
      return "Marker verwijderd";
    case "team_activities.insert":
      return "Teamactiviteit ingepland";
    default:
      return "Wijziging";
  }
}
