import { describe, expect, it } from "vitest";
import { digest } from "./digest";

describe("digest", () => {
  const secret = "test-secret-with-at-least-32-characters!";

  it("is stable for the same input and secret", () => {
    expect(digest("203.0.113.7", secret)).toBe(digest("203.0.113.7", secret));
  });

  it("does not contain the raw value", () => {
    const value = "203.0.113.7";
    expect(digest(value, secret)).not.toContain(value);
  });

  it("differs per secret, so leaked digests cannot be matched without the key", () => {
    expect(digest("203.0.113.7", secret)).not.toBe(digest("203.0.113.7", `${secret}x`));
  });

  it("is short and URL-safe", () => {
    expect(digest("a@b.test", secret)).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});
