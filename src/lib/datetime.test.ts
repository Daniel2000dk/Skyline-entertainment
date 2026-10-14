import { describe, expect, it } from "vitest";
import { formatDateTime, formatGta, isoToLocalInput, localInputToIso } from "./datetime";

describe("localInputToIso", () => {
  it("converts winter time (CET, UTC+1)", () => {
    expect(localInputToIso("2026-12-01T21:00")).toBe("2026-12-01T20:00:00.000Z");
  });

  it("converts summer time (CEST, UTC+2)", () => {
    expect(localInputToIso("2026-07-15T21:00")).toBe("2026-07-15T19:00:00.000Z");
  });

  it("handles the day daylight saving time ends", () => {
    expect(localInputToIso("2026-10-25T12:00")).toBe("2026-10-25T11:00:00.000Z");
  });

  it.each(["", "2026-12-01", "21:00", "morgen", null, undefined])(
    "returns null for %j",
    (value) => {
      expect(localInputToIso(value)).toBeNull();
    },
  );
});

describe("isoToLocalInput", () => {
  it("round-trips through the form value", () => {
    for (const value of ["2026-12-01T21:00", "2026-07-15T08:30", "2027-03-29T00:15"]) {
      expect(isoToLocalInput(localInputToIso(value))).toBe(value);
    }
  });

  it("returns an empty string without a date", () => {
    expect(isoToLocalInput(null)).toBe("");
  });
});

describe("formatting", () => {
  it("shows dates in Dutch in Amsterdam time", () => {
    expect(formatDateTime("2026-12-01T20:00:00Z")).toContain("21:00");
    expect(formatDateTime("2026-12-01T20:00:00Z")).toContain("dec");
  });

  it("formats whole GTA dollars", () => {
    expect(formatGta(25000)).toBe("GTA$ 25.000");
    expect(formatGta(null)).toBe("GTA$ 0");
  });
});
