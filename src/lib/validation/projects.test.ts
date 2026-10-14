import { describe, expect, it } from "vitest";
import { fieldErrors } from "./auth";
import { createProjectSchema, runbookItemSchema, updateProjectSchema } from "./projects";

const validUpdate = {
  title: "Paleto Rally",
  eventTypeId: "",
  description: "",
  budget: "5000",
  summary: "",
  location: "Paleto Bay",
  startsAt: "2026-12-05T21:00",
  endsAt: "2026-12-05T23:00",
  capacity: "30",
  entryFee: "2500",
  rules: "",
  registrationMode: "closed",
};

describe("createProjectSchema", () => {
  it("turns empty optional fields into null and converts the start to UTC", () => {
    expect(
      createProjectSchema.parse({
        title: " Rally ",
        eventTypeId: "",
        startsAt: "2026-12-05T21:00",
        description: "",
      }),
    ).toEqual({
      title: "Rally",
      eventTypeId: null,
      startsAt: "2026-12-05T20:00:00.000Z",
      description: null,
    });
  });

  it("rejects a missing name and a malformed type id", () => {
    const result = createProjectSchema.safeParse({
      title: "  ",
      eventTypeId: "abc",
      startsAt: "",
      description: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(fieldErrors(result.error)).toMatchObject({
        title: "Vul een naam in.",
        eventTypeId: "Ongeldige keuze.",
      });
    }
  });
});

describe("updateProjectSchema", () => {
  it("accepts valid details", () => {
    const result = updateProjectSchema.parse(validUpdate);
    expect(result).toMatchObject({ budget: 5000, capacity: 30, entryFee: 2500, summary: null });
  });

  it.each([
    ["end before start", { endsAt: "2026-12-05T20:00" }, "endsAt"],
    ["negative entry fee", { entryFee: "-1" }, "entryFee"],
    ["fractional budget", { budget: "10.5" }, "budget"],
    ["zero capacity", { capacity: "0" }, "capacity"],
    ["unknown registration mode", { registrationMode: "everyone" }, "registrationMode"],
    ["overlong summary", { summary: "x".repeat(301) }, "summary"],
  ])("rejects %s", (_label, override, field) => {
    const result = updateProjectSchema.safeParse({ ...validUpdate, ...override });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrors(result.error))).toContain(field);
  });
});

describe("runbookItemSchema", () => {
  it("requires a title but nothing else", () => {
    expect(
      runbookItemSchema.safeParse({ title: "Start", startsAt: "", details: "", responsibleId: "" })
        .success,
    ).toBe(true);
    expect(
      runbookItemSchema.safeParse({ title: "", startsAt: "", details: "", responsibleId: "" })
        .success,
    ).toBe(false);
  });
});
