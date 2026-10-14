import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, createStaff, loginAsStaff, useRandomIp } from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await useRandomIp(context);
});

// 1×1 transparent PNG and a minimal PDF.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

test("an idea is shared, voted on, approved and turned into a project", async ({
  page,
  browser,
}) => {
  const author = await createStaff("team_member", "Iris Idee");
  const manager = await createStaff("organizer", "Mats Manager");
  const title = `Onderwaterrace ${Date.now()}`;

  await loginAsStaff(page, author);
  await page
    .getByRole("navigation", { name: "Hoofdmenu" })
    .getByRole("link", { name: "Ideeën" })
    .click();
  await page.getByText("Nieuw idee delen").click();
  await page.getByLabel("Idee", { exact: true }).fill(title);
  await page.getByLabel("Omschrijving (optioneel)").fill("Met duikpakken en boeien");
  await page.getByRole("button", { name: "Idee plaatsen" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(`Stemmen op ${title}`) }).click();
  await expect(
    page.getByRole("button", { name: new RegExp(`Stem intrekken voor ${title} \\(1 stem\\)`) }),
  ).toBeVisible();
  // The author cannot judge their own idea.
  await expect(page.getByRole("button", { name: "Goedkeuren" })).toHaveCount(0);

  await page
    .getByLabel("Bestand toevoegen")
    .setInputFiles({ name: "schets.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Uploaden" }).click();
  await expect(page.getByText("Bestand toegevoegd.")).toBeVisible();
  const image = page.getByRole("img", { name: "schets.png" });
  await expect(image).toBeVisible();
  const imageResponse = await page.request.get((await image.getAttribute("src"))!);
  expect(imageResponse.headers()["content-type"]).toBe("image/png");
  expect(imageResponse.headers()["content-security-policy"]).toContain("sandbox");

  await page.getByLabel("Schrijf een bericht…").fill("Wie heeft er duikpakken?");
  await page.getByRole("button", { name: "Plaatsen" }).click();
  await expect(page.getByRole("article", { name: "Bericht van Iris Idee" })).toBeVisible();
  const ideaUrl = page.url();

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await loginAsStaff(managerPage, manager);
  await managerPage.goto(ideaUrl);
  await managerPage.getByRole("button", { name: "Goedkeuren" }).click();
  await expect(
    managerPage.getByText("Goedgekeurd", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await managerPage.getByLabel("Type evenement").selectOption({ label: "Jetskirace" });
  await managerPage.getByRole("button", { name: "Project starten" }).click();

  await expect(managerPage.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(
    managerPage.locator('[data-slot="badge"]', { hasText: "Goedgekeurd" }),
  ).toBeVisible();
  await expect(
    managerPage.getByRole("link", { name: title }).filter({ visible: true }),
  ).toBeVisible();
  await managerPage
    .getByRole("navigation", { name: "Projectonderdelen" })
    .getByRole("link", { name: "Taken" })
    .click();
  await expect(managerPage.getByRole("link", { name: "Parcours testvaren" })).toBeVisible();
  await managerContext.close();
});

test("uploads are checked by content and only for permitted staff", async ({ page, browser }) => {
  const owner = await createStaff("organizer", "Bea Bestand");
  const reader = await createStaff("team_member", "Lex Lezer");
  const { data: project } = await admin
    .from("projects")
    .insert({ title: `Bestanden ${Date.now()}`, owner_id: owner.id })
    .select("id, title")
    .single();
  await admin
    .from("events")
    .insert({ project_id: project!.id, title: project!.title, slug: `files-${randomUUID()}` });

  await loginAsStaff(page, owner);
  await page.goto(`/intern/projecten/${project!.id}/bestanden`);

  // HTML disguised as an image is refused.
  await page.getByLabel("Bestand toevoegen").setInputFiles({
    name: "foto.png",
    mimeType: "image/png",
    buffer: Buffer.from("<!doctype html><script>alert(1)</script>"),
  });
  await page.getByRole("button", { name: "Uploaden" }).click();
  await expect(
    page.getByText("Alleen afbeeldingen (PNG, JPG, WebP, GIF) en PDF-bestanden zijn toegestaan."),
  ).toBeVisible();

  await page
    .getByLabel("Bestand toevoegen")
    .setInputFiles({ name: "draaiboek.pdf", mimeType: "application/pdf", buffer: PDF });
  await page.getByRole("button", { name: "Uploaden" }).click();
  await expect(page.getByText("Bestand toegevoegd.")).toBeVisible();
  const link = page.getByRole("link", { name: "draaiboek.pdf" });
  const href = (await link.getAttribute("href"))!;
  const download = await page.request.get(href);
  expect(download.status()).toBe(200);
  expect(download.headers()["content-disposition"]).toContain("attachment");

  // Without a session the file is not served.
  const anonymous = await browser.newContext();
  const anonymousResponse = await anonymous.request.get(`http://localhost:3000${href}`, {
    maxRedirects: 0,
  });
  expect(anonymousResponse.status()).toBe(307);
  await anonymous.close();

  // Staff without edit rights can see but not add or remove files.
  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  await loginAsStaff(readerPage, reader);
  await readerPage.goto(`/intern/projecten/${project!.id}/bestanden`);
  await expect(readerPage.getByRole("link", { name: "draaiboek.pdf" })).toBeVisible();
  await expect(readerPage.getByLabel("Bestand toevoegen")).toHaveCount(0);
  await expect(readerPage.getByRole("button", { name: "draaiboek.pdf verwijderen" })).toHaveCount(
    0,
  );
  await readerContext.close();

  await page.getByRole("button", { name: "draaiboek.pdf verwijderen" }).click();
  await expect(page.getByText("Nog geen bestanden.")).toBeVisible();
  const { count } = await admin
    .from("attachments")
    .select("id", { count: "exact", head: true })
    .eq("project_id", project!.id);
  expect(count).toBe(0);
});
