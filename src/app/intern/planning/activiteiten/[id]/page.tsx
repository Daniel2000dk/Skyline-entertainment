import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth/staff";
import { dayKeyOf } from "@/lib/calendar/dates";
import { getActivity } from "@/lib/calendar/queries";
import { formatDateTime } from "@/lib/datetime";
import { listActiveStaff } from "@/lib/projects/queries";
import { uuidSchema } from "@/lib/validation/projects";
import { ActivityEditor } from "./activity-editor";

export const metadata: Metadata = { title: "Teamactiviteit" };

export default async function ActivityPage({
  params,
}: PageProps<"/intern/planning/activiteiten/[id]">) {
  const staff = await requireStaff();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();
  const activity = await getActivity(id);
  if (!activity) notFound();

  const canEdit =
    activity.createdById === staff.id || staff.role === "admin" || staff.role === "organizer";
  const activeStaff = canEdit ? await listActiveStaff() : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/intern/planning?weergave=dag&datum=${dayKeyOf(activity.startsAt)}`}
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          Planning
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{activity.title}</h1>
        <p className="text-sm text-muted-foreground">
          {formatDateTime(activity.startsAt)}
          {activity.endsAt && ` – ${formatDateTime(activity.endsAt)}`}
          {activity.location && ` · ${activity.location}`}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Details</h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p>Verantwoordelijke: {activity.responsibleName ?? "niemand"}</p>
          <p className="whitespace-pre-line">{activity.description || "Geen toelichting."}</p>
          <p className="text-xs text-muted-foreground">
            Ingepland door {activity.createdByName ?? "onbekend"}
          </p>
          {canEdit && <ActivityEditor activity={activity} staff={activeStaff} />}
        </CardContent>
      </Card>
    </div>
  );
}
