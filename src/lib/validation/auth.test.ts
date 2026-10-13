import { describe, expect, it } from "vitest";
import {
  confirmSchema,
  fieldErrors,
  inviteSchema,
  loginSchema,
  newPasswordSchema,
  setPasswordSchema,
} from "./auth";

describe("loginSchema", () => {
  it("normalizes the email address", () => {
    const result = loginSchema.parse({ email: "  Admin@Skyline.TEST ", password: "x" });
    expect(result.email).toBe("admin@skyline.test");
  });

  it("rejects an invalid email with a Dutch message", () => {
    const result = loginSchema.safeParse({ email: "geen-email", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(fieldErrors(result.error).email).toBe("Vul een geldig e-mailadres in.");
  });

  it("rejects missing fields", () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("accepts 12+ characters with letters and digits", () => {
    expect(newPasswordSchema.safeParse("rally-paleto-2026").success).toBe(true);
  });

  it.each([
    ["too short", "kort123"],
    ["no digits", "alleenletters-hier"],
    ["no letters", "123456789012345"],
    ["over 72 bytes", `a1${"é".repeat(40)}`],
  ])("rejects a password that is %s", (_label, value) => {
    expect(newPasswordSchema.safeParse(value).success).toBe(false);
  });
});

describe("setPasswordSchema", () => {
  it("requires matching confirmation", () => {
    const result = setPasswordSchema.safeParse({
      password: "rally-paleto-2026",
      confirm: "anders-2026x",
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(fieldErrors(result.error).confirm).toBe("De wachtwoorden komen niet overeen.");
  });
});

describe("inviteSchema", () => {
  it("accepts a valid invitation", () => {
    const result = inviteSchema.parse({
      email: "Nieuw@Skyline.test",
      displayName: "  Sam  ",
      role: "organizer",
    });
    expect(result).toEqual({ email: "nieuw@skyline.test", displayName: "Sam", role: "organizer" });
  });

  it("rejects unknown roles (no privilege smuggling)", () => {
    expect(
      inviteSchema.safeParse({ email: "a@b.test", displayName: "A", role: "superadmin" }).success,
    ).toBe(false);
  });

  it("rejects overlong display names", () => {
    expect(
      inviteSchema.safeParse({ email: "a@b.test", displayName: "x".repeat(61), role: "admin" })
        .success,
    ).toBe(false);
  });
});

describe("confirmSchema", () => {
  it("accepts invite and recovery tokens", () => {
    expect(confirmSchema.safeParse({ tokenHash: "abcDEF123_-xyz", type: "invite" }).success).toBe(
      true,
    );
    expect(confirmSchema.safeParse({ tokenHash: "abcDEF123_-xyz", type: "recovery" }).success).toBe(
      true,
    );
  });

  it.each([
    ["signup", { tokenHash: "abcDEF123_-xyz", type: "signup" }],
    ["magiclink", { tokenHash: "abcDEF123_-xyz", type: "magiclink" }],
    ["markup in token", { tokenHash: "<script>alert(1)</script>", type: "invite" }],
    ["short token", { tokenHash: "abc", type: "invite" }],
  ])("rejects %s", (_label, value) => {
    expect(confirmSchema.safeParse(value).success).toBe(false);
  });
});
