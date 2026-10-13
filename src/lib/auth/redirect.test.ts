import { describe, expect, it } from "vitest";
import { INTERNAL_HOME, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each(["/intern", "/intern/team", "/intern/projecten/123?tab=taken", "/intern?x=1"])(
    "allows internal path %s",
    (path) => {
      expect(safeNextPath(path)).toBe(path);
    },
  );

  it.each([
    ["absolute URL", "https://evil.example/intern"],
    ["protocol-relative URL", "//evil.example/intern"],
    ["backslash trick", "/\\evil.example"],
    ["path outside /intern", "/login"],
    ["lookalike prefix", "/internet"],
    ["whitespace", "/intern /x"],
    ["javascript URL", "javascript:alert(1)"],
    ["empty string", ""],
    ["non-string", 42],
    ["overlong value", `/intern/${"a".repeat(300)}`],
  ])("rejects %s", (_label, value) => {
    expect(safeNextPath(value)).toBe(INTERNAL_HOME);
  });
});
