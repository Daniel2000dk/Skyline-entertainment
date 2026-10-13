import { createHmac, randomInt, randomUUID } from "node:crypto";
import { expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type StaffRole = "admin" | "organizer" | "team_member";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set (local Supabase env required for e2e)`);
  return value;
}

/** Secret-key client for test setup against the LOCAL Supabase only. */
export const admin = createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}@skyline.test`;
}

export function strongPassword(): string {
  return `Rally-${randomUUID()}-9`;
}

/** Each test gets its own "client IP" so rate-limit buckets do not collide. */
export async function useRandomIp(context: BrowserContext) {
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`,
  });
}

export type TestUser = { id: string; email: string; password: string; name: string };

/** Creates staff the same way production does: invitation first, then Auth user. */
export async function createStaff(role: StaffRole, name = `Test ${role}`): Promise<TestUser> {
  const email = uniqueEmail(role);
  const password = strongPassword();
  const { error: inviteError } = await admin
    .from("staff_invitations")
    .insert({ email, display_name: name, role });
  if (inviteError) throw inviteError;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { id: data.user.id, email, password, name };
}

/** An Auth account that was never invited (must get no access at all). */
export async function createNonStaffUser(): Promise<TestUser> {
  const email = uniqueEmail("outsider");
  const password = strongPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { id: data.user.id, email, password, name: "Outsider" };
}

/** The form message (excludes Next.js' route announcer, which also has role=alert). */
export function formAlert(page: Page) {
  return page.locator('[data-slot="alert"]');
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await page.getByRole("button", { name: "Inloggen" }).click();
}

export async function loginAsStaff(page: Page, user: TestUser) {
  await login(page, user.email, user.password);
  await expect(page.getByRole("heading", { name: `Welkom, ${user.name}` })).toBeVisible();
}

/** Latest password-reset link sent to `email`, read from the local Mailpit inbox. */
export async function latestResetLink(email: string): Promise<string> {
  let link: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await fetch(
          `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`,
        ).then((response) => response.json());
        const id = search.messages?.[0]?.ID;
        if (!id) return undefined;
        const message = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`).then((response) =>
          response.json(),
        );
        link = /href="([^"]*\/bevestigen\?[^"]*)"/.exec(message.HTML ?? "")?.[1];
        return link;
      },
      { timeout: 15_000 },
    )
    .toBeTruthy();
  return link!.replaceAll("&amp;", "&");
}

// --- MFA (TOTP, RFC 6238: SHA-1, 30 s, 6 digits) — what an authenticator app computes.

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input.toUpperCase().replace(/[s=]/g, "")) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function totp(secret: string, timeMs = Date.now()): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(timeMs / 30_000)));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

/** A code from a later 30-second window than `previous` (codes are not reusable). */
export async function nextTotp(secret: string, previous: string): Promise<string> {
  let code = totp(secret);
  while (code === previous) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    code = totp(secret);
  }
  return code;
}

/** Enables MFA for a user through the public Auth API, as the user would. Returns code + secret. */
export async function enableMfaFor(user: TestUser): Promise<{ secret: string; lastCode: string }> {
  const client = createClient(required("SUPABASE_URL"), required("SUPABASE_PUBLISHABLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: loginError } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (loginError) throw loginError;
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "e2e" });
  if (error) throw error;
  const lastCode = totp(data.totp.secret);
  const { error: verifyError } = await client.auth.mfa.challengeAndVerify({
    factorId: data.id,
    code: lastCode,
  });
  if (verifyError) throw verifyError;
  return { secret: data.totp.secret, lastCode };
}
