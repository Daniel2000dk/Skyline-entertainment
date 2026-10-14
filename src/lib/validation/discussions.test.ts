import { describe, expect, it } from "vitest";
import { fieldErrors } from "./auth";
import { commentSchema, suggestionSchema } from "./discussions";

describe("commentSchema", () => {
  it("trims and requires text", () => {
    expect(commentSchema.parse({ body: "  Top idee  " })).toEqual({ body: "Top idee" });
    expect(commentSchema.safeParse({ body: "   " }).success).toBe(false);
  });
});

describe("suggestionSchema", () => {
  it("accepts a free-form suggestion without field", () => {
    expect(
      suggestionSchema.parse({ field: "", proposedValue: "", message: "Extra ronde?" }),
    ).toEqual({
      field: null,
      proposedValue: null,
      message: "Extra ronde?",
    });
  });

  it("normalizes dates to UTC and amounts to whole numbers", () => {
    expect(
      suggestionSchema.parse({
        field: "starts_at",
        proposedValue: "2026-12-05T21:00",
        message: "Later",
      }).proposedValue,
    ).toBe("2026-12-05T20:00:00.000Z");
    expect(
      suggestionSchema.parse({
        field: "entry_fee_gta",
        proposedValue: "0500",
        message: "Goedkoper",
      }).proposedValue,
    ).toBe("500");
  });

  it.each([
    ["an empty value", { field: "location", proposedValue: "" }],
    ["a too long name", { field: "title", proposedValue: "x".repeat(121) }],
    ["an invalid date", { field: "ends_at", proposedValue: "morgen" }],
    ["a negative amount", { field: "budget_gta", proposedValue: "-5" }],
    ["a fractional amount", { field: "entry_fee_gta", proposedValue: "2.5" }],
    ["zero capacity", { field: "capacity", proposedValue: "0" }],
  ])("rejects %s with a message on the value", (_label, input) => {
    const result = suggestionSchema.safeParse({ ...input, message: "Toelichting" });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty("proposedValue");
  });

  it("rejects unknown fields (no writing to arbitrary columns)", () => {
    expect(
      suggestionSchema.safeParse({
        field: "owner_id",
        proposedValue: "x",
        message: "Ik ben eigenaar",
      }).success,
    ).toBe(false);
  });
});
