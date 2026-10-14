import { describe, expect, it } from "vitest";
import {
  activationSchema,
  fieldErrors,
  inviteSchema,
  loginSchema,
  newPasswordSchema,
  setPasswordSchema,
} from "./auth";

describe("loginSchema", () => {
  it("normalizes the username", () => {
    const result = loginSchema.parse({ username: "  Daniel ", password: "x" });
    expect(result.username).toBe("daniel");
  });

  it("asks for a username with a Dutch message", () => {
    const result = loginSchema.safeParse({ username: " ", password: "x" });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(fieldErrors(result.error).username).toBe("Vul je gebruikersnaam in.");
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
      username: " Sam.Racer ",
      displayName: "  Sam  ",
      role: "organizer",
    });
    expect(result).toEqual({ username: "sam.racer", displayName: "Sam", role: "organizer" });
  });

  it.each(["ab", ".start", "met spatie", "x".repeat(31), "naam@mail"])(
    "rejects the username %j",
    (username) => {
      expect(inviteSchema.safeParse({ username, displayName: "A", role: "admin" }).success).toBe(
        false,
      );
    },
  );

  it("rejects unknown roles (no privilege smuggling)", () => {
    expect(
      inviteSchema.safeParse({ username: "abc", displayName: "A", role: "superadmin" }).success,
    ).toBe(false);
  });

  it("rejects overlong display names", () => {
    expect(
      inviteSchema.safeParse({ username: "abc", displayName: "x".repeat(61), role: "admin" })
        .success,
    ).toBe(false);
  });
});

describe("activationSchema", () => {
  const token = "a".repeat(43);
  const valid = {
    token,
    code: "abcd-efgh",
    password: "rally-paleto-2026",
    confirm: "rally-paleto-2026",
  };

  it("normalizes the code (case, dash, spaces)", () => {
    expect(activationSchema.parse({ ...valid, code: " abcd efgh " }).code).toBe("ABCDEFGH");
    expect(activationSchema.parse(valid).code).toBe("ABCDEFGH");
  });

  it.each([
    ["a short token", { ...valid, token: "abc" }],
    ["a token with other characters", { ...valid, token: `${"a".repeat(42)}/` }],
    ["a short code", { ...valid, code: "ABC" }],
    ["a weak password", { ...valid, password: "kort", confirm: "kort" }],
    ["a different confirmation", { ...valid, confirm: "anders-2026x" }],
  ])("rejects %s", (_label, value) => {
    expect(activationSchema.safeParse(value).success).toBe(false);
  });
});
