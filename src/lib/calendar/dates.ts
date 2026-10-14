import { isoToLocalInput, localInputToIso } from "@/lib/datetime";

/** A calendar day in the app time zone, as "YYYY-MM-DD". */
export type DayKey = string;
export type CalendarView = "dag" | "week" | "maand";

const DAY_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string") return false;
  const match = DAY_KEY.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

/** Calendar arithmetic on plain dates (independent of time zones and DST). */
export function addDays(key: DayKey, days: number): DayKey {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function weekday(key: DayKey): number {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // Monday = 0
}

export function startOfWeek(key: DayKey): DayKey {
  return addDays(key, -weekday(key));
}

export function startOfMonth(key: DayKey): DayKey {
  return `${key.slice(0, 7)}-01`;
}

export function addMonths(key: DayKey, months: number): DayKey {
  const [y, m] = key.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 10);
}

/** The day an instant falls on in the app time zone. */
export function dayKeyOf(iso: string): DayKey {
  return isoToLocalInput(iso).slice(0, 10);
}

export function todayKey(now: Date = new Date()): DayKey {
  return dayKeyOf(now.toISOString());
}

/** UTC instant of local midnight at the start of a day. */
export function startOfDayIso(key: DayKey): string {
  return localInputToIso(`${key}T00:00`)!;
}

export type CalendarRange = {
  view: CalendarView;
  anchor: DayKey;
  /** Days to render (month view: full Monday–Sunday weeks). */
  days: DayKey[];
  /** Query bounds (inclusive start, exclusive end), as UTC ISO. */
  from: string;
  to: string;
  previous: DayKey;
  next: DayKey;
};

export function calendarRange(view: CalendarView, anchor: DayKey): CalendarRange {
  let first: DayKey;
  let count: number;
  let previous: DayKey;
  let next: DayKey;
  if (view === "dag") {
    first = anchor;
    count = 1;
    previous = addDays(anchor, -1);
    next = addDays(anchor, 1);
  } else if (view === "week") {
    first = startOfWeek(anchor);
    count = 7;
    previous = addDays(first, -7);
    next = addDays(first, 7);
  } else {
    const monthStart = startOfMonth(anchor);
    const monthEnd = addDays(addMonths(monthStart, 1), -1);
    first = startOfWeek(monthStart);
    const last = addDays(startOfWeek(monthEnd), 6);
    count = Math.round((Date.parse(last) - Date.parse(first)) / 86_400_000) + 1;
    previous = addMonths(monthStart, -1);
    next = addMonths(monthStart, 1);
  }
  const days = Array.from({ length: count }, (_, index) => addDays(first, index));
  return {
    view,
    anchor,
    days,
    from: startOfDayIso(days[0]!),
    to: startOfDayIso(addDays(days[days.length - 1]!, 1)),
    previous,
    next,
  };
}

const monthTitle = new Intl.DateTimeFormat("nl-NL", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayTitle = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayShort = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const asUtcDate = (key: DayKey) => new Date(`${key}T12:00:00Z`);

export function rangeTitle(range: CalendarRange): string {
  if (range.view === "dag") return dayTitle.format(asUtcDate(range.anchor));
  if (range.view === "week") {
    return `${dayShort.format(asUtcDate(range.days[0]!))} – ${dayShort.format(asUtcDate(range.days[6]!))}`;
  }
  return monthTitle.format(asUtcDate(range.anchor));
}

export function formatDayShort(key: DayKey): string {
  return dayShort.format(asUtcDate(key));
}
