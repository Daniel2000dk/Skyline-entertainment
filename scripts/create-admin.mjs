// Creates the first Administrator (or a new login link for an existing one)
// and prints a one-time link to set the password. Nothing is emailed.
//
// Local:   node --env-file=.env.local scripts/create-admin.mjs --email you@example.com --name "Jouw naam"
// Hosted:  put SUPABASE_URL, SUPABASE_SECRET_KEY and SITE_URL of that project in a
//          gitignored file (e.g. .env.bootstrap) and pass it with --env-file.
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" } },
});

const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();
const { SUPABASE_URL, SUPABASE_SECRET_KEY, SITE_URL } = process.env;

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || name.length > 60) {
  console.error('Gebruik: --email naam@voorbeeld.nl --name "Naam (max. 60 tekens)"');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !SITE_URL) {
  console.error(
    "SUPABASE_URL, SUPABASE_SECRET_KEY en SITE_URL moeten gezet zijn (via --env-file).",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function link(tokenHash, type) {
  const url = new URL("/bevestigen", SITE_URL);
  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", type);
  return url.toString();
}

const { data: existing } = await admin
  .from("staff_invitations")
  .select("user_id")
  .eq("email", email)
  .not("user_id", "is", null)
  .maybeSingle();

if (existing?.user_id) {
  // Already an account: hand out a fresh password link instead.
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error) throw error;
  console.log(
    `Account bestaat al. Nieuwe link om een wachtwoord in te stellen (1 uur geldig):\n${link(data.properties.hashed_token, "recovery")}`,
  );
  process.exit(0);
}

const { error: inviteError } = await admin
  .from("staff_invitations")
  .insert({ email, display_name: name, role: "admin" });
if (inviteError && inviteError.code !== "23505") throw inviteError;

const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email });
if (error) throw error;

console.log(
  `Administrator "${name}" aangemaakt. Open deze link om een wachtwoord in te stellen (1 uur geldig, eenmalig):\n${link(data.properties.hashed_token, "invite")}`,
);
