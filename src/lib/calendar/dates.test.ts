import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  calendarRange,
  dayKeyOf,
  isDayKey,
  rangeTitle,
  startOfWeek,
  todayKey,
} from "./dates";

describe("day keys", () => {
  it("validates real dates only", () => {
    expect(isDayKey("2026-10-14")).toBe(true);
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("14-10-2026")).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });

  it("does calendar arithmetic across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-01");
  });

  it("starts weeks on Monday", () => {
    expect(startOfWeek("2026-10-14")).toBe("2026-10-12"); // Wednesday → Monday
    expect(startOfWeek("2026-10-18")).toBe("2026-10-12"); // Sunday → Monday
  });

  it("assigns instants to the Amsterdam day", () => {
    expect(dayKeyOf("2026-10-14T22:30:00Z")).toBe("2026-10-15"); // 00:30 CEST
    expect(dayKeyOf("2026-12-31T22:59:00Z")).toBe("2026-12-31"); // 23:59 CET
    expect(todayKey(new Date("2026-06-30T23:00:00Z"))).toBe("2026-07-01");
  });
});

describe("calendarRange", () => {
  it("covers a whole month in Monday–Sunday weeks", () => {
    const range = calendarRange("maand", "2026-10-14");
    expect(range.days[0]).toBe("2026-09-28");
    expect(range.days.at(-1)).toBe("2026-11-01");
    expect(range.days).toHaveLength(35);
    expect(range.previous).toBe("2026-09-01");
    expect(range.next).toBe("2026-11-01");
  });

  it("uses local midnight as bounds, also across the DST change", () => {
    const range = calendarRange("week", "2026-10-25"); // DST ends on Sunday 25 October
    expect(range.from).toBe("2026-10-18T22:00:00.000Z"); // Mon 19 Oct 00:00 CEST
    expect(range.to).toBe("2026-10-25T23:00:00.000Z"); // Mon 26 Oct 00:00 CET
  });

  it("titles ranges in Dutch", () => {
    expect(rangeTitle(calendarRange("maand", "2026-10-14"))).toBe("oktober 2026");
    expect(rangeTitle(calendarRange("dag", "2026-10-14"))).toBe("woensdag 14 oktober 2026");
  });
});
