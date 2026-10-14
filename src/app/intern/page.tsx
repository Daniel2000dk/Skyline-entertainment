import type { Metadata } from "next";
import Link from "next/link";
import { EventsChart } from "@/components/dashboard/events-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StatusBadge } from "@/components/projects/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/auth/staff";
import { addDays, formatDayShort, todayKey } from "@/lib/calendar/dates";
import {
  getDashboardFigures,
  listRecentActivity,
  listUpcomingEvents,
} from "@/lib/dashboard/queries";
import { resolvePeriod, type PeriodPreset } from "@/lib/dashboard/period";
import { formatDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: "week", label: "Week" },
  { value: "maand", label: "Maand" },
  { value: "kwartaal", label: "Kwartaal" },
  { value: "jaar", label: "Jaar" },
];

export default async function DashboardPage({ searchParams }: PageProps<"/intern">) {
  const staff = await requireStaff();
  const params = await searchParams;
  const period = resolvePeriod(params, todayKey());
  const [figures, upcoming, activity] = await Promise.all([
    getDashboardFigures(period),
    listUpcomingEvents(),
    listRecentActivity(),
  ]);
  const periodLabel = `${formatDayShort(period.fromKey)} – ${formatDayShort(addDays(period.toKey, -1))}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welkom, ${staff.displayName}`}
        description="Overzicht van Skyline Entertainment."
      />

      {/* One filter row scopes every figure below it. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <nav aria-label="Periode" className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Link
              key={preset.value}
              href={preset.value === "maand" ? "/intern" : `/intern?periode=${preset.value}`}
              aria-current={period.preset === preset.value ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                period.preset === preset.value
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {preset.label}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2" aria-label="Eigen periode">
          <input type="hidden" name="periode" value="eigen" />
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Van
            <Input type="date" name="van" defaultValue={period.fromKey} required className="h-9" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Tot en met
            <Input
              type="date"
              name="tot"
              defaultValue={addDays(period.toKey, -1)}
              required
              className="h-9"
            />
          </label>
          <button type="submit" className={buttonVariants({ variant: "outline" })}>
            Toepassen
          </button>
        </form>
      </div>
      <p className="-mt-3 text-sm text-muted-foreground" aria-live="polite">
        Periode: {periodLabel}
      </p>

      <section aria-label="Kerncijfers" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile
          label="Gehouden evenementen"
          value={figures.eventsHeld}
          detail={`${figures.eventsInPeriod} gepland in periode`}
        />
        <StatTile
          label="Komende evenementen"
          value={figures.upcomingEvents}
          detail="Goedgekeurd of later"
          href="/intern/planning"
        />
        <StatTile
          label="Openstaande taken"
          value={figures.openTasks}
          detail={
            figures.overdueTasks > 0
              ? `${figures.overdueTasks} te laat`
              : `${figures.myOpenTasks} van jou`
          }
          tone={figures.overdueTasks > 0 ? "warning" : undefined}
          href="/intern/taken?weergave=alle"
        />
        <StatTile label="Afgeronde taken" value={figures.tasksCompleted} detail="In deze periode" />
        <StatTile
          label="Open ideeën"
          value={figures.openIdeas}
          detail="Nieuw of in bespreking"
          href="/intern/ideeen"
        />
      </section>
      <p className="-mt-3 text-xs text-muted-foreground">
        Deelnames, inkomsten, kosten en nettoresultaat verschijnen hier zodra inschrijvingen en de
        financiële administratie zijn ingericht.
      </p>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Evenementen per {period.granularity === "day" ? "dag" : "maand"}</h2>
            </CardTitle>
            <CardDescription>
              Alle niet-geannuleerde evenementen met een starttijd in de periode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EventsChart
              data={figures.eventsPerBucket}
              title={`Evenementen per ${period.granularity === "day" ? "dag" : "maand"}`}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Komende evenementen</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog niets gepland.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {upcoming.map((event) => (
                  <li key={event.projectId} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/intern/projecten/${event.projectId}`}
                        className="text-sm font-medium underline-offset-4 hover:underline"
                      >
                        {event.title}
                      </Link>
                      <StatusBadge status={event.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.startsAt)}
                      {event.location && ` · ${event.location}`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Recente projectactiviteit</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog geen activiteit.</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-sm">
                    <span className="font-medium">{entry.description}</span>
                    {entry.projectTitle && (
                      <>
                        {" · "}
                        {entry.projectId ? (
                          <Link
                            href={`/intern/projecten/${entry.projectId}`}
                            className="underline-offset-4 hover:underline"
                          >
                            {entry.projectTitle}
                          </Link>
                        ) : (
                          entry.projectTitle
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.actorName} · {formatDateTime(entry.occurredAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
