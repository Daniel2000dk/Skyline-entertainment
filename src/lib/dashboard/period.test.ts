import { describe, expect, it } from "vitest";
import { resolvePeriod } from "./period";

const today = "2026-10-14"; // Wednesday

describe("resolvePeriod", () => {
  it("defaults to the current month with daily buckets", () => {
    const period = resolvePeriod({}, today);
    expect(period).toMatchObject({
      preset: "maand",
      fromKey: "2026-10-01",
      toKey: "2026-11-01",
      granularity: "day",
    });
    expect(period.buckets).toHaveLength(31);
    expect(period.from).toBe("2026-09-30T22:00:00.000Z");
  });

  it("supports week, quarter and year", () => {
    expect(resolvePeriod({ periode: "week" }, today)).toMatchObject({
      fromKey: "2026-10-12",
      toKey: "2026-10-19",
    });
    expect(resolvePeriod({ periode: "kwartaal" }, today)).toMatchObject({
      fromKey: "2026-10-01",
      toKey: "2027-01-01",
      granularity: "month",
      buckets: ["2026-10", "2026-11", "2026-12"],
    });
    expect(resolvePeriod({ periode: "jaar" }, today).buckets).toHaveLength(12);
  });

  it("accepts a valid custom range, inclusive of the end date", () => {
    expect(
      resolvePeriod({ periode: "eigen", van: "2026-01-01", tot: "2026-01-31" }, today),
    ).toMatchObject({
      preset: "eigen",
      fromKey: "2026-01-01",
      toKey: "2026-02-01",
    });
  });

  it.each([
    ["end before start", { van: "2026-02-01", tot: "2026-01-01" }],
    ["invalid dates", { van: "2026-02-30", tot: "2026-03-01" }],
    ["a range of decades", { van: "2000-01-01", tot: "2026-01-01" }],
  ])("falls back to the month for %s", (_label, range) => {
    expect(resolvePeriod({ periode: "eigen", ...range }, today).preset).toBe("maand");
  });
});
