import { describe, expect, it } from "vitest";
import { isRecentlyAuthenticated } from "./recent-auth";

const now = 1_800_000_000;

describe("isRecentlyAuthenticated", () => {
  it("accepts a login within the window", () => {
    const claims = { amr: [{ method: "otp", timestamp: now - 60 }] };
    expect(isRecentlyAuthenticated(claims, 900, now)).toBe(true);
  });

  it("uses the most recent authentication method", () => {
    const claims = {
      amr: [
        { method: "password", timestamp: now - 86_400 },
        { method: "recovery", timestamp: now - 30 },
      ],
    };
    expect(isRecentlyAuthenticated(claims, 900, now)).toBe(true);
  });

  it("rejects an old session", () => {
    const claims = { amr: [{ method: "password", timestamp: now - 3_600 }] };
    expect(isRecentlyAuthenticated(claims, 900, now)).toBe(false);
  });

  it.each([null, undefined, {}, { amr: "password" }, { amr: [{ method: "password" }] }])(
    "rejects missing or malformed claims (%j)",
    (claims) => {
      expect(isRecentlyAuthenticated(claims as never, 900, now)).toBe(false);
    },
  );
});
