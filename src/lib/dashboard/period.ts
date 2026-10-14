import {
  addDays,
  addMonths,
  isDayKey,
  startOfDayIso,
  startOfMonth,
  startOfWeek,
  type DayKey,
} from "@/lib/calendar/dates";

export type PeriodPreset = "week" | "maand" | "kwartaal" | "jaar" | "eigen";

export type Period = {
  preset: PeriodPreset;
  /** First day (inclusive) and the day after the last day (exclusive). */
  fromKey: DayKey;
  toKey: DayKey;
  from: string;
  to: string;
  granularity: "day" | "month";
  /** Chart buckets in order: "YYYY-MM-DD" for days, "YYYY-MM" for months. */
  buckets: string[];
};

const MAX_CUSTOM_DAYS = 3 * 366;

function daysBetween(fromKey: DayKey, toKey: DayKey) {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86_400_000);
}

function build(preset: PeriodPreset, fromKey: DayKey, toKey: DayKey): Period {
  const days = daysBetween(fromKey, toKey);
  const granularity = days <= 62 ? "day" : "month";
  const buckets: string[] = [];
  if (granularity === "day") {
    for (let day = fromKey; day < toKey; day = addDays(day, 1)) buckets.push(day);
  } else {
    for (let month = startOfMonth(fromKey); month < toKey; month = addMonths(month, 1)) {
      buckets.push(month.slice(0, 7));
    }
  }
  return {
    preset,
    fromKey,
    toKey,
    from: startOfDayIso(fromKey),
    to: startOfDayIso(toKey),
    granularity,
    buckets,
  };
}

/**
 * Resolves the dashboard filter. Presets are the current week/month/quarter/
 * year (Amsterdam time); a custom range is inclusive of both dates. Invalid
 * input falls back to the current month.
 */
export function resolvePeriod(
  params: { periode?: unknown; van?: unknown; tot?: unknown },
  today: DayKey,
): Period {
  const preset = params.periode;
  if (preset === "week") {
    const from = startOfWeek(today);
    return build("week", from, addDays(from, 7));
  }
  if (preset === "kwartaal") {
    const month = Number(today.slice(5, 7));
    const from = `${today.slice(0, 4)}-${String(month - ((month - 1) % 3)).padStart(2, "0")}-01`;
    return build("kwartaal", from, addMonths(from, 3));
  }
  if (preset === "jaar") {
    const from = `${today.slice(0, 4)}-01-01`;
    return build("jaar", from, addMonths(from, 12));
  }
  if (
    preset === "eigen" &&
    isDayKey(params.van) &&
    isDayKey(params.tot) &&
    params.van <= params.tot
  ) {
    const to = addDays(params.tot, 1);
    if (daysBetween(params.van, to) <= MAX_CUSTOM_DAYS) return build("eigen", params.van, to);
  }
  const from = startOfMonth(today);
  return build("maand", from, addMonths(from, 1));
}
