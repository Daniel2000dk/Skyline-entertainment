/**
 * All dates are stored as UTC timestamps and shown/entered in the community's
 * time zone, independent of the server's (UTC on Vercel) or a viewer's zone.
 */
export const APP_TIME_ZONE = "Europe/Amsterdam";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zonedFields(date: Date) {
  const fields: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") fields[part.type] = Number(part.value);
  }
  return fields as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

/** Milliseconds the app time zone is ahead of UTC at a given instant. */
function offsetMs(timestamp: number): number {
  const f = zonedFields(new Date(timestamp));
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - Math.floor(timestamp / 1000) * 1000;
}

/** "2026-12-01T21:00" (wall-clock time in Amsterdam) → ISO UTC string, or null. */
export function localInputToIso(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as [number, number, number, number, number, number];
  const wallClock = Date.UTC(y, mo - 1, d, h, mi);
  // Two passes settle the offset around daylight-saving transitions.
  let timestamp = wallClock - offsetMs(wallClock);
  timestamp = wallClock - offsetMs(timestamp);
  return new Date(timestamp).toISOString();
}

/** ISO timestamp → value for <input type="datetime-local"> in Amsterdam time. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const f = zonedFields(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${f.year}-${pad(f.month)}-${pad(f.day)}T${pad(f.hour)}:${pad(f.minute)}`;
}

const dateTimeFormat = new Intl.DateTimeFormat("nl-NL", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("nl-NL", {
  timeZone: APP_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeFormat = new Intl.DateTimeFormat("nl-NL", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTimeFormat.format(new Date(iso)) : "Nog niet gepland";
}

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFormat.format(new Date(iso)) : "Nog niet gepland";
}

export function formatTime(iso: string | null | undefined): string {
  return iso ? timeFormat.format(new Date(iso)) : "";
}

const gtaFormat = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 });

/** Whole in-game dollars, e.g. "GTA$ 25.000". */
export function formatGta(amount: number | null | undefined): string {
  return `GTA$ ${gtaFormat.format(amount ?? 0)}`;
}
