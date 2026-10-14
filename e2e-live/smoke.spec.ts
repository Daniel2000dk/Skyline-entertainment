import { createHmac, randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// One login, every module once, then a full clean-up. Only run against a
// deployed site with the owner's approval (see playwright.live.config.ts).

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const db = createClient(required("SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = randomUUID().slice(0, 8);
const name = `Livetest ${runId}`;
const email = `livetest-${runId}@skyline.test`;
const password = `Live-${randomUUID()}-9`;
const title = `Livetest race ${runId}`;
const seeded = { ideaId: "", ideaTitle: `Livetest omzetten ${runId}` };
let userId = "";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

function totp(secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of secret.toUpperCase().replace(/[\s=]/g, "")) {
    value = (value << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hmac = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  return ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

function formAlert(page: Page) {
  return page.locator('[data-slot="alert"]');
}

test.beforeAll(async () => {
  const { error: inviteError } = await db
    .from("staff_invitations")
    .insert({ email, display_name: name, role: "admin" });
  if (inviteError) throw inviteError;
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  userId = data.user.id;

  const { data: idea, error: ideaError } = await db
    .from("ideas")
    .insert({ title: seeded.ideaTitle, description: "Aangemaakt door de livetest" })
    .select("id")
    .single();
  if (ideaError) throw ideaError;
  seeded.ideaId = idea.id;
});

test.afterAll(async () => {
  const projectIds = userId
    ? ((await db.from("projects").select("id").eq("owner_id", userId)).data ?? []).map((p) => p.id)
    : [];
  const ideaIds = [
    seeded.ideaId,
    ...(userId
      ? ((await db.from("ideas").select("id").eq("author_id", userId)).data ?? []).map((i) => i.id)
      : []),
  ].filter(Boolean);
  if (userId) {
    const { data: files } = await db
      .from("attachments")
      .select("storage_path")
      .eq("uploaded_by", userId);
    const paths = (files ?? []).map((file) => file.storage_path);
    if (paths.length) await db.storage.from("staff-files").remove(paths);
    await db.from("team_activities").delete().eq("created_by", userId);
  }
  if (ideaIds.length) await db.from("ideas").delete().in("id", ideaIds);
  if (projectIds.length) await db.from("projects").delete().in("id", projectIds);
  await db.from("staff_invitations").delete().eq("email", email);
  if (userId) await db.auth.admin.deleteUser(userId);

  const left = await Promise.all([
    db.from("projects").select("id", { count: "exact", head: true }).ilike("title", `%${runId}%`),
    db.from("ideas").select("id", { count: "exact", head: true }).ilike("title", `%${runId}%`),
    db.from("staff_profiles").select("id", { count: "exact", head: true }).eq("id", userId),
  ]);
  expect(left.map((result) => result.count)).toEqual([0, 0, 0]);
});

test("every module works on the live site", async ({ page, browser }) => {
  await test.step("public site, headers and closed doors", async () => {
    const response = await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const headers = response!.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["strict-transport-security"]).toBeTruthy();

    const anonymous = await browser.newContext();
    const internal = await anonymous.request.get(`${required("LIVE_BASE_URL")}/intern`, {
      maxRedirects: 0,
    });
    expect(internal.status()).toBe(307);
    expect(internal.headers().location).toContain("/login");
    await anonymous.close();

    const rest = await fetch(`${required("SUPABASE_URL")}/rest/v1/projects?select=id`, {
      headers: { apikey: required("SUPABASE_PUBLISHABLE_KEY") },
    });
    expect(rest.status).toBe(401);
  });

  await test.step("login (wrong password refused, then in)", async () => {
    await page.goto("/login");
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByLabel("Wachtwoord").fill(`${password}x`);
    await page.getByRole("button", { name: "Inloggen" }).click();
    await expect(formAlert(page)).toBeVisible();
    await page.getByLabel("Wachtwoord").fill(password);
    await page.getByRole("button", { name: "Inloggen" }).click();
    await expect(page.getByRole("heading", { name: `Welkom, ${name}` })).toBeVisible();
    await expect(page.getByRole("region", { name: "Kerncijfers" })).toBeVisible();
  });

  let projectId = "";
  await test.step("project from a template, details, status, checklist", async () => {
    await page.goto("/intern/projecten/nieuw");
    await page.getByLabel("Naam").fill(title);
    await page.getByLabel("Type evenement").selectOption({ label: "Motorrace" });
    await page.getByLabel("Start (optioneel)").fill("2099-06-12T20:00");
    await page.getByRole("button", { name: "Project aanmaken" }).click();
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    projectId = page.url().split("/").pop()!;
    const { count } = await db
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    expect(count).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Bewerken" }).click();
    await page.getByLabel("Locatie").fill("Legion Square");
    await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
    await expect(page.getByText("Wijzigingen opgeslagen.")).toBeVisible();

    await page.getByLabel("Status").selectOption("approved");
    await page.getByRole("button", { name: "Status opslaan" }).click();
    await expect(page.getByText("Status opgeslagen.")).toBeVisible();

    const checklist = page.getByPlaceholder("Nieuw punt…");
    await checklist.fill("Prijzen ophalen");
    await checklist.press("Enter");
    await page.getByRole("checkbox", { name: "Prijzen ophalen" }).click();
    await expect(page.getByRole("checkbox", { name: "Prijzen ophalen" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  await test.step("runbook, tasks and the task board", async () => {
    await page.getByRole("link", { name: "Draaiboek" }).click();
    await page.getByLabel("Onderdeel", { exact: true }).fill("Briefing deelnemers");
    await page.getByLabel("Tijd").fill("2099-06-12T19:45");
    await page.getByRole("button", { name: "Toevoegen" }).click();
    await expect(page.getByText("Onderdeel toegevoegd.")).toBeVisible();

    await page.goto(`/intern/projecten/${projectId}/taken`);
    await page.getByLabel("Titel").fill(`Bekers ${runId}`);
    await page.getByLabel("Verantwoordelijke").selectOption({ label: name });
    await page.getByLabel("Prioriteit").selectOption("high");
    await page.getByRole("button", { name: "Taak toevoegen" }).click();
    await expect(page.getByText("Taak toegevoegd.")).toBeVisible();

    await page.goto("/intern/taken");
    await page.getByRole("button", { name: `Bekers ${runId}: Starten` }).click();
    await expect(
      page.getByRole("region", { name: "Bezig" }).getByRole("link", { name: `Bekers ${runId}` }),
    ).toBeVisible();
  });

  await test.step("discussion and suggestions", async () => {
    await db.from("suggestions").insert({
      project_id: projectId,
      field: "capacity",
      proposed_value: "25",
      message: `Livetest-suggestie ${runId}`,
    });
    await page.goto(`/intern/projecten/${projectId}/discussie`);
    await page
      .getByRole("textbox", { name: "Schrijf een bericht…", exact: true })
      .fill("Livetest bericht");
    await page.getByRole("button", { name: "Plaatsen" }).click();
    await expect(page.getByRole("article", { name: `Bericht van ${name}` })).toContainText(
      "Livetest bericht",
    );

    const seededCard = page.getByRole("article").filter({ hasText: `Livetest-suggestie ${runId}` });
    await seededCard.getByRole("button", { name: "Accepteren" }).click();
    await expect(seededCard).toContainText("Geaccepteerd");
    const { data: event } = await db
      .from("events")
      .select("capacity")
      .eq("project_id", projectId)
      .single();
    expect(event?.capacity).toBe(25);

    await page.getByLabel("Waarover gaat je voorstel?").selectOption("location");
    await page.getByLabel("Nieuwe waarde: Locatie").fill("Del Perro Pier");
    await page.getByLabel("Toelichting").fill("Eigen voorstel");
    await page.getByRole("button", { name: "Suggestie indienen" }).click();
    await expect(page.getByText("Suggestie ingediend.")).toBeVisible();
    const ownCard = page.getByRole("article").filter({ hasText: "Eigen voorstel" });
    await ownCard.getByRole("button", { name: "Intrekken" }).click();
    await expect(ownCard).toContainText("Ingetrokken");
  });

  await test.step("GTA map: private image, route and marker", async () => {
    await page.goto(`/intern/projecten/${projectId}/kaart`);
    await expect(page.locator(".leaflet-image-layer")).toBeVisible();
    await expect(page.getByText("nog geen kaartafbeelding")).toHaveCount(0);
    const image = await page.request.get("/intern/kaart/afbeelding");
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toMatch(/^image//);

    await page.getByLabel("Naam van de route").fill(`Route ${runId}`);
    await page.getByRole("button", { name: "Route toevoegen" }).click();
    await expect(page.getByRole("heading", { name: "Route bewerken" })).toBeVisible();
    const box = (await page.locator(".leaflet-container").boundingBox())!;
    for (const [dx, dy] of [[-40, -60], [0, 0], [40, 60]] as const) {
      await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy);
    }
    await page.getByRole("button", { name: "Route opslaan" }).click();
    await expect(page.getByRole("button", { name: `Route ${runId}, 3 punten` })).toBeVisible();

    await page.getByRole("button", { name: "Marker plaatsen" }).click();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2 + 100);
    await page.getByLabel("Naam van de marker").fill("Parkeren");
    await page.getByRole("button", { name: "Marker opslaan" }).click();
    await expect(page.getByRole("button", { name: "Marker Parkeren verwijderen" })).toBeVisible();
  });

  await test.step("files (private storage) and history", async () => {
    await page.goto(`/intern/projecten/${projectId}/bestanden`);
    await page
      .getByLabel("Bestand toevoegen")
      .setInputFiles({ name: "draaiboek.pdf", mimeType: "application/pdf", buffer: PDF });
    await page.getByRole("button", { name: "Uploaden" }).click();
    await expect(page.getByText("Bestand toegevoegd.")).toBeVisible();
    const href = (await page.getByRole("link", { name: "draaiboek.pdf" }).getAttribute("href"))!;
    const download = await page.request.get(href);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-disposition"]).toContain("attachment");

    const anonymous = await browser.newContext();
    const denied = await anonymous.request.get(`${required("LIVE_BASE_URL")}${href}`, {
      maxRedirects: 0,
    });
    expect(denied.status()).toBe(307);
    await anonymous.close();

    await page.getByRole("button", { name: "draaiboek.pdf verwijderen" }).click();
    await expect(page.getByText("Nog geen bestanden.")).toBeVisible();

    await page.getByRole("link", { name: "Geschiedenis" }).click();
    await expect(
      page
        .getByText(/Locatie.*gewijzigd/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  await test.step("ideas: share, vote, image, approve and convert", async () => {
    await page.goto("/intern/ideeen");
    await page.getByText("Nieuw idee delen").click();
    await page.getByLabel("Idee", { exact: true }).fill(`Livetest idee ${runId}`);
    await page.getByRole("button", { name: "Idee plaatsen" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: `Livetest idee ${runId}` }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: new RegExp(`Stemmen op Livetest idee ${runId}`) })
      .click();
    await expect(page.getByRole("button", { name: /Stem intrekken voor/ })).toBeVisible();
    await page
      .getByLabel("Bestand toevoegen")
      .setInputFiles({ name: "schets.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: "Uploaden" }).click();
    const image = page.getByRole("img", { name: "schets.png" });
    await expect(image).toBeVisible();
    const imageResponse = await page.request.get((await image.getAttribute("src"))!);
    expect(imageResponse.headers()["content-type"]).toBe("image/png");
    expect(imageResponse.headers()["content-security-policy"]).toContain("sandbox");

    await page.goto(`/intern/ideeen/${seeded.ideaId}`);
    await page.getByRole("button", { name: "Goedkeuren" }).click();
    await page.getByLabel("Type evenement").selectOption({ label: "Jetskirace" });
    await page.getByRole("button", { name: "Project starten" }).click();
    await expect(page.getByRole("heading", { level: 1, name: seeded.ideaTitle })).toBeVisible();
  });

  await test.step("planning: calendar, team activity, rescheduling", async () => {
    await page.goto("/intern/planning?weergave=maand&datum=2099-06-01");
    await expect(page.getByRole("link", { name: new RegExp(`20:00 ${title}`) })).toBeVisible();
    await page.getByText("Teamactiviteit inplannen").click();
    await page.getByLabel("Titel").fill(`Teamoverleg ${runId}`);
    await page.getByLabel("Start").fill("2099-06-20T20:00");
    await page.getByRole("button", { name: "Activiteit inplannen" }).click();
    await expect(page.getByText("Activiteit ingepland.")).toBeVisible();

    await page.goto("/intern/planning?weergave=dag&datum=2099-06-12");
    await page.getByRole("button", { name: "Verplaatsen" }).click();
    await page.getByLabel(`Nieuwe start voor ${title}`).fill("2099-06-19T21:00");
    await page.getByRole("button", { name: "Verplaatsen" }).click();
    await expect
      .poll(async () => {
        const { data } = await db
          .from("events")
          .select("starts_at")
          .eq("project_id", projectId)
          .single();
        return data && new Date(data.starts_at!).toISOString();
      })
      .toBe("2099-06-19T19:00:00.000Z");
  });

  await test.step("team, account with two-factor authentication, logout", async () => {
    await page.goto("/intern/team");
    await expect(
      page.getByRole("listitem").filter({ hasText: name }).getByText("Jij"),
    ).toBeVisible();

    await page.goto("/intern/account");
    await page.getByRole("button", { name: "Tweestapsverificatie instellen" }).click();
    const secret = (await page.getByTestId("mfa-secret").textContent())!.trim();
    await page.getByLabel("Code uit je authenticator-app").fill(totp(secret));
    await page.getByRole("button", { name: "Bevestigen" }).click();
    await expect(page.getByText("Tweestapsverificatie staat aan.")).toBeVisible();
    await page.getByRole("button", { name: "Tweestapsverificatie uitzetten" }).click();
    await page.getByRole("button", { name: "Ja, uitzetten" }).click();
    await expect(
      page.getByRole("button", { name: "Tweestapsverificatie instellen" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Uitloggen" }).first().click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/intern");
    await expect(page).toHaveURL(/\/login\?next=%2Fintern$/);
  });
});
