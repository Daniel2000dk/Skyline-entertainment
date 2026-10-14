import { expect, test, type Page } from "@playwright/test";
import { admin, createStaff, formAlert, loginAsStaff, useRandomIp } from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await useRandomIp(context);
});

async function createProject(
  page: Page,
  title: string,
  options: { type?: string; startsAt?: string } = {},
) {
  await page.goto("/intern/projecten/nieuw");
  await page.getByLabel("Naam").fill(title);
  if (options.type) await page.getByLabel("Type evenement").selectOption({ label: options.type });
  if (options.startsAt) await page.getByLabel("Start (optioneel)").fill(options.startsAt);
  await page.getByRole("button", { name: "Project aanmaken" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  return page.url().split("/").pop()!;
}

test("an Event Manager creates a project from a template", async ({ page }) => {
  const manager = await createStaff("organizer", "Maya Manager");
  await loginAsStaff(page, manager);
  await page
    .getByRole("navigation", { name: "Hoofdmenu" })
    .getByRole("link", { name: "Projecten" })
    .click();
  await page.getByRole("link", { name: "Nieuw project" }).click();

  const title = `Paleto Rally ${Date.now()}`;
  const projectId = await createProject(page, title, {
    type: "Motorrace",
    startsAt: "2026-12-05T21:00",
  });

  await expect(page.locator('[data-slot="badge"]', { hasText: "Idee" })).toBeVisible();
  await expect(page.getByText("Eigenaar: Maya Manager").first()).toBeVisible();

  const { count: taskCount } = await admin
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const { data: type } = await admin
    .from("event_types")
    .select("id")
    .eq("name", "Motorrace")
    .single();
  const { count: templateCount } = await admin
    .from("task_templates")
    .select("id", { count: "exact", head: true })
    .eq("event_type_id", type!.id);
  expect(taskCount).toBe(templateCount);
  expect(taskCount).toBeGreaterThan(0);

  await page.goto("/intern/projecten");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("details can be edited, are versioned and can be reverted", async ({ page }) => {
  const manager = await createStaff("organizer", "Ruben Revisie");
  await loginAsStaff(page, manager);
  await createProject(page, `Car meet ${Date.now()}`, { type: "Car meeting" });

  await page.getByRole("button", { name: "Bewerken" }).click();
  await page.getByLabel("Locatie").fill("Legion Square");
  await page.getByLabel("Max. deelnemers").fill("40");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect(page.getByText("Wijzigingen opgeslagen.")).toBeVisible();
  await expect(page.getByText("Legion Square").first()).toBeVisible();

  await page.getByRole("link", { name: "Geschiedenis" }).click();
  await expect(page.getByText("Locatie, Max. deelnemers gewijzigd")).toBeVisible();
  await page.getByRole("button", { name: "Terugzetten" }).first().click();
  await page.getByRole("button", { name: "Ja, terugzetten" }).click();
  await expect(page.getByText("Teruggezet.")).toBeVisible();

  await page.getByRole("link", { name: "Overzicht" }).click();
  // Visible-only: Next keeps the previous tab mounted (hidden) via React Activity.
  await expect(page.getByText("Legion Square").filter({ visible: true })).toHaveCount(0);
});

test("invalid input is refused with a clear message", async ({ page }) => {
  const manager = await createStaff("organizer");
  await loginAsStaff(page, manager);
  await createProject(page, `Validatie ${Date.now()}`);

  await page.getByRole("button", { name: "Bewerken" }).click();
  await page.getByLabel("Start").fill("2026-12-05T22:00");
  await page.getByLabel("Einde").fill("2026-12-05T21:00");
  await page.getByLabel("Inschrijfgeld (GTA$)").fill("-5");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect(page.getByText("Het einde moet na de start liggen.")).toBeVisible();
  await expect(page.getByText("Het bedrag kan niet negatief zijn.")).toBeVisible();
});

test("publishing requires a start time", async ({ page }) => {
  const manager = await createStaff("organizer");
  await loginAsStaff(page, manager);
  await createProject(page, `Publiceren ${Date.now()}`);

  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Status opslaan" }).click();
  await expect(formAlert(page).filter({ hasText: "Publiceren kan pas" })).toBeVisible();

  await page.getByRole("button", { name: "Bewerken" }).click();
  await page.getByLabel("Start").fill("2026-12-05T21:00");
  await page.getByRole("button", { name: "Wijzigingen opslaan" }).click();
  await expect(page.getByText("Wijzigingen opgeslagen.")).toBeVisible();

  await page.getByLabel("Status").selectOption("published");
  await page.getByRole("button", { name: "Status opslaan" }).click();
  await expect(page.getByText("Status opgeslagen.")).toBeVisible();
  await expect(page.locator('[data-slot="badge"]', { hasText: "Gepubliceerd" })).toBeVisible();
});

test("only the owner manages; members with edit rights edit; others only read", async ({
  page,
  browser,
}) => {
  const manager = await createStaff("organizer", "Olga Owner");
  const member = await createStaff("team_member", `Erik Editor ${Date.now()}`);
  const reader = await createStaff("team_member", "Lisa Lezer");
  await loginAsStaff(page, manager);
  const projectId = await createProject(page, `Teamwerk ${Date.now()}`);

  await page.getByLabel("Lid toevoegen").selectOption({ label: member.name });
  await page.getByLabel("Recht", { exact: true }).selectOption("editor");
  await page.getByRole("button", { name: "Toevoegen" }).last().click();
  await expect(page.getByText("Lid toegevoegd.")).toBeVisible();

  // The editor can edit content and tick the checklist, but not manage.
  const editorContext = await browser.newContext();
  const editorPage = await editorContext.newPage();
  await loginAsStaff(editorPage, member);
  await editorPage.goto(`/intern/projecten/${projectId}`);
  await expect(editorPage.getByRole("button", { name: "Bewerken" })).toBeVisible();
  await expect(editorPage.getByLabel("Status")).toHaveCount(0);
  await expect(editorPage.getByRole("button", { name: "Project verwijderen" })).toHaveCount(0);
  await editorPage.getByPlaceholder("Nieuw punt…").fill("Prijzen ophalen");
  await editorPage.getByRole("button", { name: "Toevoegen" }).click();
  await editorPage.getByRole("checkbox", { name: "Prijzen ophalen" }).click();
  await expect(editorPage.getByRole("checkbox", { name: "Prijzen ophalen" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await editorContext.close();

  // Other staff can read but not change anything.
  const readerContext = await browser.newContext();
  const readerPage = await readerContext.newPage();
  await loginAsStaff(readerPage, reader);
  await readerPage.goto(`/intern/projecten/${projectId}`);
  await expect(readerPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(readerPage.getByRole("button", { name: "Bewerken" })).toHaveCount(0);
  await expect(readerPage.getByRole("checkbox")).toHaveCount(0);
  await expect(readerPage.getByText("Prijzen ophalen")).toBeVisible();
  await readerPage.goto("/intern/projecten");
  await expect(readerPage.getByRole("link", { name: "Nieuw project" })).toHaveCount(0);
  await readerPage.goto("/intern/projecten/nieuw");
  await expect(readerPage).toHaveURL(/\/intern\/geen-toegang$/);
  await readerContext.close();
});

test("the runbook keeps a timed plan", async ({ page }) => {
  const manager = await createStaff("organizer");
  await loginAsStaff(page, manager);
  await createProject(page, `Draaiboek ${Date.now()}`);

  await page.getByRole("link", { name: "Draaiboek" }).click();
  await page.getByLabel("Onderdeel", { exact: true }).fill("Briefing deelnemers");
  await page.getByLabel("Tijd").fill("2026-12-05T20:45");
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await expect(page.getByText("Onderdeel toegevoegd.")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Briefing deelnemers" })).toContainText(
    "20:45",
  );
});

test("an owner can delete a project after confirming", async ({ page }) => {
  const manager = await createStaff("organizer");
  await loginAsStaff(page, manager);
  const title = `Weg ermee ${Date.now()}`;
  await createProject(page, title);

  await page.getByRole("button", { name: "Project verwijderen" }).click();
  await page.getByRole("button", { name: "Ja, definitief verwijderen" }).click();
  await expect(page).toHaveURL(/\/intern\/projecten$/);
  await page.goto(`/intern/projecten?status=all&q=${encodeURIComponent(title)}`);
  await expect(page.getByText("Geen projecten gevonden")).toBeVisible();
});
