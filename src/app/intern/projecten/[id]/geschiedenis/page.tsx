import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/staff";
import { formatDateTime, formatGta } from "@/lib/datetime";
import { REGISTRATION_MODE_LABELS, type RegistrationMode } from "@/lib/projects/labels";
import { getProject, listEventTypes, listRevisions, projectRights } from "@/lib/projects/queries";
import { RevertButton } from "./revert-button";

export const metadata: Metadata = { title: "Geschiedenis" };

const COLUMN_LABELS: Record<string, string> = {
  title: "Naam",
  description: "Omschrijving",
  event_type_id: "Type",
  budget_gta: "Budget",
  summary: "Korte publieke tekst",
  rules: "Spelregels",
  location: "Locatie",
  starts_at: "Start",
  ends_at: "Einde",
  capacity: "Max. deelnemers",
  entry_fee_gta: "Inschrijfgeld",
  registration_mode: "Inschrijving",
};

function formatValue(column: string, value: unknown, typeNames: Map<string, string>): string {
  if (value === null || value === undefined || value === "") return "(leeg)";
  if (column === "starts_at" || column === "ends_at") return formatDateTime(String(value));
  if (column === "budget_gta" || column === "entry_fee_gta") return formatGta(Number(value));
  if (column === "event_type_id") return typeNames.get(String(value)) ?? "Onbekend type";
  if (column === "registration_mode")
    return REGISTRATION_MODE_LABELS[value as RegistrationMode] ?? String(value);
  const text = String(value);
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
}

export default async function HistoryPage({
  params,
}: PageProps<"/intern/projecten/[id]/geschiedenis">) {
  const staff = await requireStaff();
  const project = await getProject((await params).id);
  if (!project) notFound();

  const { canEdit } = projectRights(staff, project);
  const [revisions, eventTypes] = await Promise.all([listRevisions(project.id), listEventTypes()]);
  const typeNames = new Map(eventTypes.map((type) => [type.id, type.name]));

  if (revisions.length === 0) {
    return <p className="text-sm text-muted-foreground">Nog geen inhoudelijke wijzigingen.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Elke inhoudelijke wijziging wordt bewaard. Terugzetten herstelt de vorige waarde en wordt
        zelf ook als wijziging vastgelegd.
      </p>
      <ol className="flex flex-col gap-3">
        {revisions.map((revision) => (
          <li key={revision.id}>
            <Card className="gap-3 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {revision.changedColumns
                      .map((column) => COLUMN_LABELS[column] ?? column)
                      .join(", ")}{" "}
                    gewijzigd
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {revision.changedByName} · {formatDateTime(revision.changedAt)}
                  </p>
                </div>
                {canEdit && <RevertButton revisionId={revision.id} />}
              </div>
              <dl className="grid gap-1 text-sm">
                {revision.changedColumns.map((column) => (
                  <div key={column} className="flex flex-col sm:flex-row sm:gap-2">
                    <dt className="text-muted-foreground sm:w-44 sm:shrink-0">
                      Was ({COLUMN_LABELS[column] ?? column}):
                    </dt>
                    <dd className="break-words whitespace-pre-line">
                      {formatValue(column, revision.previous[column], typeNames)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
