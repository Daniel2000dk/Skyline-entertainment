// Uploads the GTA V map image to the private "maps" bucket (staff-only).
// The image is not ours to publish, so it never goes into the public repo:
// keep it locally in private/maps/ (gitignored) and upload it with this script.
//
// Local:   npm run map:upload -- private/maps/gta-v-kaart.png
// Hosted:  node --env-file=<file with SUPABASE_URL and SUPABASE_SECRET_KEY> scripts/upload-map.mjs <image>
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const path = process.argv[2];
const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!path || !SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("Gebruik: node --env-file=<bestand> scripts/upload-map.mjs <afbeelding>");
  process.exit(1);
}

const bytes = await readFile(path);
const type = bytes
  .subarray(0, 8)
  .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ? "image/png"
  : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    ? "image/jpeg"
    : bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
        bytes.subarray(8, 12).toString("latin1") === "WEBP"
      ? "image/webp"
      : null;
if (!type) {
  console.error("Alleen PNG, JPEG of WebP.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await admin.storage
  .from("maps")
  .upload("gta-v-kaart", bytes, { contentType: type, upsert: true });
if (error) throw error;
console.log(`Kaart geüpload (${type}, ${Math.round(bytes.length / 1024)} kB).`);
