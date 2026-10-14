import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import {
  admin,
  assignRandomIp,
  createStaff,
  loginAsStaff,
  newClient,
  type TestUser,
} from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

async function createProject(owner: TestUser) {
  const { data: project, error } = await admin
    .from("projects")
    .insert({ title: `Kaartproject ${Date.now()}`, owner_id: owner.id })
    .select("id, title")
    .single();
  if (error) throw error;
  await admin
    .from("events")
    .insert({ project_id: project.id, title: project.title, slug: `kaart-${randomUUID()}` });
  return project;
}

/** Clicks the map at an offset (in pixels) from its centre. */
async function clickMap(page: Page, dx: number, dy: number) {
  const box = (await page.locator(".leaflet-container").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy);
}

test("an editor draws a route with a checkpoint and places a marker", async ({ page, browser }) => {
  const owner = await createStaff("organizer", "Kees Kaart");
  const reader = await createStaff("team_member", "Lotte Lezer");
  const project = await createProject(owner);

  await loginAsStaff(page, owner);
  await page.goto(`/intern/projecten/${project.id}`);
  await page
    .getByRole("navigation", { name: "Projectonderdelen" })
    .getByRole("link", { name: "Kaart" })
    .click();
  await expect(page.locator(".leaflet-image-layer")).toBeVisible();

  await page.getByLabel("Naam van de route").fill("Hoofdroute");
  await page.getByLabel("Kleur").selectOption("blue");
  await page.getByRole("button", { name: "Route toevoegen" }).click();
  await expect(page.getByRole("heading", { name: "Route bewerken" })).toBeVisible();

  await clickMap(page, -60, -80);
  await clickMap(page, 0, -20);
  await clickMap(page, 40, 30);
  await clickMap(page, 60, 90);
  const points = page.getByRole("list").filter({ hasText: "Start" });
  await expect(points.getByRole("listitem")).toHaveText([
    /^Start/,
    /^Punt 2/,
    /^Punt 3/,
    /^Finish/,
  ]);

  await page.getByLabel("Punt 2: checkpoint").check();
  await page.getByRole("button", { name: "Punt 3 verwijderen" }).click();
  await expect(points.getByRole("listitem")).toHaveText(["Start", /Checkpoint 1/, "Finish"]);
  await page.getByRole("button", { name: "Route opslaan" }).click();
  await expect(page.getByRole("button", { name: /Hoofdroute.*3 punten/ })).toBeVisible();

  const { data: route } = await admin
    .from("map_routes")
    .select("color, points")
    .eq("project_id", project.id)
    .single();
  expect(route?.color).toBe("blue");
  const saved = route?.points as Array<{ x: number; y: number; checkpoint?: boolean }>;
  expect(saved).toHaveLength(3);
  expect(saved[1]?.checkpoint).toBe(true);
  for (const point of saved) {
    expect(point.x).toBeGreaterThanOrEqual(0);
    expect(point.x).toBeLessThanOrEqual(1);
    expect(point.y).toBeGreaterThan(0);
    expect(point.y).toBeLessThan(1);
  }
  // Points are stored in drawing order: the start lies above-left of the finish.
  expect(saved[0]!.x).toBeLessThan(saved[2]!.x);
  expect(saved[0]!.y).toBeLessThan(saved[2]!.y);

  await page.getByRole("button", { name: "Marker plaatsen" }).click();
  await clickMap(page, -30, 60);
  await page.getByLabel("Naam van de marker").fill("Parkeren");
  await page.getByLabel("Notitie (optioneel)").fill("Achter de pier");
  await page.getByRole("button", { name: "Marker opslaan" }).click();
  await expect(page.getByRole("button", { name: "Marker Parkeren verwijderen" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /Hoofdroute.*3 punten/ })).toBeVisible();
  await expect(page.getByText("Achter de pier")).toBeVisible();

  // Other staff can look, not draw.
  const readerContext = await newClient(browser);
  const readerPage = await readerContext.newPage();
  await loginAsStaff(readerPage, reader);
  await readerPage.goto(`/intern/projecten/${project.id}/kaart`);
  await expect(readerPage.getByRole("button", { name: /Hoofdroute/ })).toBeVisible();
  await expect(readerPage.getByRole("button", { name: "Route toevoegen" })).toHaveCount(0);
  await expect(readerPage.getByRole("button", { name: "Marker plaatsen" })).toHaveCount(0);
  await expect(readerPage.getByRole("button", { name: /bewerken$/ })).toHaveCount(0);
  await readerContext.close();
});

test("an editor can delete a route after confirming", async ({ page }) => {
  const owner = await createStaff("organizer");
  const project = await createProject(owner);
  await admin.from("map_routes").insert({
    project_id: project.id,
    name: "Weg ermee",
    points: [
      { x: 0.2, y: 0.2 },
      { x: 0.3, y: 0.3 },
    ],
  });

  await loginAsStaff(page, owner);
  await page.goto(`/intern/projecten/${project.id}/kaart`);
  await page.getByRole("button", { name: "Weg ermee, 2 punten" }).click();
  await page.getByRole("button", { name: "Verwijderen" }).click();
  await page.getByRole("button", { name: "Ja, route verwijderen" }).click();
  await expect(page.getByText("Nog geen routes.")).toBeVisible();
});

test("the map image is only served to staff", async ({ page, browser }) => {
  const { data: existing } = await admin.storage
    .from("maps")
    .list("", { search: "gta-v-kaart", limit: 10 });
  const uploaded = !existing?.some((file) => file.name === "gta-v-kaart");
  if (uploaded) {
    await admin.storage
      .from("maps")
      .upload("gta-v-kaart", PNG, { contentType: "image/png", upsert: true });
  }
  try {
    const anonymous = await newClient(browser);
    const denied = await anonymous.request.get("http://localhost:3000/intern/kaart/afbeelding", {
      maxRedirects: 0,
    });
    expect(denied.status()).toBe(307);
    await anonymous.close();

    const staff = await createStaff("team_member");
    await loginAsStaff(page, staff);
    const response = await page.request.get("/intern/kaart/afbeelding");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\//);
    expect(response.headers()["cache-control"]).toContain("private");
  } finally {
    if (uploaded) await admin.storage.from("maps").remove(["gta-v-kaart"]);
  }
});
