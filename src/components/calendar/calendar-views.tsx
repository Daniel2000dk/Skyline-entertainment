import Link from "next/link";
import { dayKeyOf, formatDayShort, type CalendarRange, type DayKey } from "@/lib/calendar/dates";
import type { CalendarItem } from "@/lib/calendar/queries";
import { formatTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { RescheduleForm } from "./reschedule-form";

const KIND_STYLE: Record<CalendarItem["kind"], { label: string; className: string }> = {
  event: { label: "Evenement", className: "border-l-primary" },
  task: { label: "Deadline", className: "border-l-info" },
  activity: { label: "Teamactiviteit", className: "border-l-success" },
};

export function CalendarLegend() {
  return (
    <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legenda">
      {Object.values(KIND_STYLE).map((kind) => (
        <li key={kind.label} className={cn("border-l-4 pl-2", kind.className)}>
          {kind.label}
        </li>
      ))}
    </ul>
  );
}

function groupByDay(items: CalendarItem[]) {
  const map = new Map<DayKey, CalendarItem[]>();
  for (const item of items) {
    const key = dayKeyOf(item.startsAt);
    map.set(key, [...(map.get(key) ?? []), item]);
  }
  return map;
}

function ItemLine({ item, detailed }: { item: CalendarItem; detailed: boolean }) {
  const kind = KIND_STYLE[item.kind];
  return (
    <div
      className={cn(
        "rounded-md border border-l-4 bg-card px-2 py-1",
        kind.className,
        item.done && "opacity-60",
      )}
    >
      <Link href={item.href} className="block text-xs leading-snug hover:underline">
        <span className="font-mono text-muted-foreground">{formatTime(item.startsAt)}</span>{" "}
        <span className={cn("font-medium", item.done && "line-through")}>{item.title}</span>
        <span className="sr-only"> ({kind.label})</span>
      </Link>
      {detailed && item.meta && <p className="text-xs text-muted-foreground">{item.meta}</p>}
      {detailed && item.kind === "event" && item.canReschedule && item.projectId && (
        <RescheduleForm projectId={item.projectId} startsAt={item.startsAt} title={item.title} />
      )}
    </div>
  );
}

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export function MonthView({
  range,
  items,
  today,
}: {
  range: CalendarRange;
  items: CalendarItem[];
  today: DayKey;
}) {
  const byDay = groupByDay(items);
  const month = range.anchor.slice(0, 7);
  const daysWithItems = range.days.filter((day) => day.startsWith(month) && byDay.has(day));

  return (
    <>
      {/* Desktop: classic month grid */}
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day} className="px-2 py-1.5 uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {range.days.map((day) => {
            const dayItems = byDay.get(day) ?? [];
            const inMonth = day.startsWith(month);
            return (
              <div
                key={day}
                className={cn(
                  "flex min-h-28 flex-col gap-1 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-muted/20",
                )}
              >
                <Link
                  href={`/intern/planning?weergave=dag&datum=${day}`}
                  className={cn(
                    "self-start rounded px-1 text-xs",
                    day === today
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground",
                    !inMonth && "opacity-50",
                  )}
                  aria-label={`${formatDayShort(day)}${dayItems.length ? `, ${dayItems.length} items` : ""}`}
                >
                  {Number(day.slice(8))}
                </Link>
                {dayItems.slice(0, 3).map((item) => (
                  <ItemLine key={`${item.kind}-${item.id}`} item={item} detailed={false} />
                ))}
                {dayItems.length > 3 && (
                  <Link
                    href={`/intern/planning?weergave=dag&datum=${day}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    +{dayItems.length - 3} meer
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: list of days that have something planned */}
      <div className="md:hidden">
        <DayList
          days={daysWithItems}
          byDay={byDay}
          today={today}
          emptyText="Niets gepland deze maand."
        />
      </div>
    </>
  );
}

function DayList({
  days,
  byDay,
  today,
  emptyText,
}: {
  days: DayKey[];
  byDay: Map<DayKey, CalendarItem[]>;
  today: DayKey;
  emptyText: string;
}) {
  if (days.length === 0) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ol className="flex flex-col gap-4">
      {days.map((day) => (
        <li key={day} className="flex flex-col gap-2">
          <h3 className={cn("text-sm font-semibold", day === today && "text-primary")}>
            {formatDayShort(day)}
            {day === today && " · vandaag"}
          </h3>
          {(byDay.get(day) ?? []).map((item) => (
            <ItemLine key={`${item.kind}-${item.id}`} item={item} detailed />
          ))}
        </li>
      ))}
    </ol>
  );
}

export function WeekView({
  range,
  items,
  today,
}: {
  range: CalendarRange;
  items: CalendarItem[];
  today: DayKey;
}) {
  const byDay = groupByDay(items);
  return (
    <>
      <div className="hidden gap-2 md:grid md:grid-cols-7">
        {range.days.map((day) => (
          <section
            key={day}
            aria-label={formatDayShort(day)}
            className="flex min-h-48 flex-col gap-2 rounded-lg border p-2"
          >
            <Link
              href={`/intern/planning?weergave=dag&datum=${day}`}
              className={cn(
                "text-xs font-semibold hover:underline",
                day === today ? "text-primary" : "text-muted-foreground",
              )}
            >
              {formatDayShort(day)}
            </Link>
            {(byDay.get(day) ?? []).map((item) => (
              <ItemLine key={`${item.kind}-${item.id}`} item={item} detailed />
            ))}
          </section>
        ))}
      </div>
      <div className="md:hidden">
        <DayList
          days={range.days.filter((day) => byDay.has(day))}
          byDay={byDay}
          today={today}
          emptyText="Niets gepland deze week."
        />
      </div>
    </>
  );
}

export function DayView({
  range,
  items,
  today,
}: {
  range: CalendarRange;
  items: CalendarItem[];
  today: DayKey;
}) {
  const byDay = groupByDay(items);
  return (
    <DayList
      days={byDay.has(range.anchor) ? [range.anchor] : []}
      byDay={byDay}
      today={today}
      emptyText="Niets gepland op deze dag."
    />
  );
}
