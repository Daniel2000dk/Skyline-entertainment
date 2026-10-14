// Creates the first Administrator (or a new activation link for an existing
// staff member) and prints a one-time activation link plus a separate code.
// Nothing is emailed; staff log in with their username.
//
// Local:   node --env-file=.env.local scripts/create-admin.mjs --username daniel --name "Daniel"
// Hosted:  put SUPABASE_URL, SUPABASE_SECRET_KEY and SITE_URL of that project in a
//          gitignored file (e.g. .env.bootstrap) and pass it with --env-file.
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const { values } = parseArgs({
  options: { username: { type: "string" }, name: { type: "string" } },
});

const username = values.username?.trim().toLowerCase();
const name = values.name?.trim();
const { SUPABASE_URL, SUPABASE_SECRET_KEY, SITE_URL } = process.env;

if (!username || !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(username)) {
  console.error('Gebruik: --username naam [--name "Weergavenaam (max. 60 tekens)"]');
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

// Same scheme as src/lib/auth/activation.ts.
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

async function activationFor(staffId) {
  const token = randomBytes(32).toString("base64url");
  const code = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join(
    "",
  );
  await admin.from("staff_activations").delete().eq("staff_id", staffId).is("used_at", null);
  const { error } = await admin.from("staff_activations").insert({
    staff_id: staffId,
    token_hash: sha256(token),
    code_hash: sha256(`${token}:${code}`),
  });
  if (error) throw error;
  await admin.from("activity_log").insert({
    action: "login_link.created",
    entity_type: "staff_security",
    entity_id: staffId,
  });
  const url = new URL("/activeren", SITE_URL);
  url.searchParams.set("t", token);
  return `Activatielink (24 uur geldig, eenmalig):\n${url}\nActivatiecode: ${code.slice(0, 4)}-${code.slice(4)}`;
}

const { data: existing } = await admin
  .from("staff_profiles")
  .select("id")
  .eq("username", username)
  .maybeSingle();

if (existing) {
  console.log(`Account "${username}" bestaat al. ${await activationFor(existing.id)}`);
  process.exit(0);
}

if (!name || name.length > 60) {
  console.error('Nieuw account: geef ook --name "Weergavenaam (max. 60 tekens)" op.');
  process.exit(1);
}

const email = `${randomUUID()}@users.skyline.invalid`;
const { error: inviteError } = await admin
  .from("staff_invitations")
  .insert({ email, username, display_name: name, role: "admin" });
if (inviteError) throw inviteError;

const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
if (error) throw error;

console.log(
  `Administrator "${name}" aangemaakt met gebruikersnaam "${username}". ${await activationFor(data.user.id)}`,
);
