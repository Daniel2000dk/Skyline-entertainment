import "server-only";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

// No 0/O, 1/I/L: easy to read out or type over.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export const tokenHash = (token: string) => sha256(token);
/** Bound to the token, so a database copy is useless for guessing codes. */
export const codeHash = (token: string, code: string) => sha256(`${token}:${code}`);

export type Activation = { url: string; code: string };

/**
 * One-time activation link + separate 8-character code for another staff
 * member (24 hours valid). The database checks that the caller is an admin,
 * replaces older open links and logs it. Share link and code separately:
 * a forwarded link alone cannot take over the account.
 */
export async function createActivation(staffId: string): Promise<Activation | null> {
  const token = randomBytes(32).toString("base64url");
  const code = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(
    "",
  );

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_staff_activation", {
    target_staff_id: staffId,
    p_token_hash: tokenHash(token),
    p_code_hash: codeHash(token, code),
  });
  if (error) return null;

  const url = new URL("/activeren", siteUrl());
  url.searchParams.set("t", token);
  return { url: url.toString(), code: `${code.slice(0, 4)}-${code.slice(4)}` };
}
