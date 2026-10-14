import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { ActivityForm } from "@/components/calendar/activity-form";
import { CalendarLegend, DayView, MonthView, WeekView } from "@/components/calendar/calendar-views";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireStaff } from "@/lib/auth/staff";
import {
  calendarRange,
  isDayKey,
  rangeTitle,
  todayKey,
  type CalendarView,
} from "@/lib/calendar/dates";
import { listCalendarItems } from "@/lib/calendar/queries";
import { listActiveStaff } from "@/lib/projects/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Planning" };

const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: "dag", label: "Dag" },
  { value: "week", label: "Week" },
  { value: "maand", label: "Maand" },
];

export default async function PlanningPage({ searchParams }: PageProps<"/intern/planning">) {
  await requireStaff();
  const params = await searchParams;
  const view = VIEWS.find((option) => option.value === params.weergave)?.value ?? "maand";
  const today = todayKey();
  const anchor = isDayKey(params.datum) ? params.datum : today;
  const range = calendarRange(view, anchor);
  const [items, staff] = await Promise.all([
    listCalendarItems(range.from, range.to),
    listActiveStaff(),
  ]);
  const href = (datum: string, weergave: CalendarView = view) =>
    `/intern/planning?weergave=${weergave}&datum=${datum}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Planning"
        description="Evenementen, deadlines van taken en teamactiviteiten op één plek."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={href(range.previous)}
            className={buttonVariants({ variant: "outline", size: "icon" })}
            aria-label="Vorige"
          >
            <ChevronLeftIcon aria-hidden="true" />
          </Link>
          <Link href={href(today)} className={buttonVariants({ variant: "outline" })}>
            Vandaag
          </Link>
          <Link
            href={href(range.next)}
            className={buttonVariants({ variant: "outline", size: "icon" })}
            aria-label="Volgende"
          >
            <ChevronRightIcon aria-hidden="true" />
          </Link>
          <h2 className="ml-2 text-lg font-semibold capitalize" aria-live="polite">
            {rangeTitle(range)}
          </h2>
        </div>
        <nav aria-label="Weergave" className="flex gap-1">
          {VIEWS.map((option) => (
            <Link
              key={option.value}
              href={href(anchor, option.value)}
              aria-current={view === option.value ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                view === option.value
                  ? "border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      </div>

      <CalendarLegend />
      {view === "maand" && <MonthView range={range} items={items} today={today} />}
      {view === "week" && <WeekView range={range} items={items} today={today} />}
      {view === "dag" && <DayView range={range} items={items} today={today} />}

      <details className="rounded-lg border p-4">
        <summary className="cursor-pointer font-medium">Teamactiviteit inplannen</summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Voor overleg, trainingen of andere afspraken die niet bij een evenement of taak horen.
        </p>
        <div className="mt-4">
          <ActivityForm staff={staff} defaultStart={`${anchor}T20:00`} />
        </div>
      </details>
    </div>
  );
}
