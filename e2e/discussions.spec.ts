import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import {
  admin,
  createStaff,
  loginAsStaff,
  assignRandomIp,
  type TestUser,
  newClient,
} from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

async function createProject(owner: TestUser) {
  const { data: project, error } = await admin
    .from("projects")
    .insert({ title: `Discussieproject ${Date.now()}`, owner_id: owner.id })
    .select("id, title")
    .single();
  if (error) throw error;
  await admin
    .from("events")
    .insert({ project_id: project.id, title: project.title, slug: `disc-${randomUUID()}` });
  return project;
}

test("staff discuss a project in threads", async ({ page, browser }) => {
  const owner = await createStaff("organizer", "Otto Owner");
  const writer = await createStaff("team_member", "Wendy Schrijver");
  const boss = await createStaff("admin", "Anna Admin");
  const project = await createProject(owner);

  await loginAsStaff(page, writer);
  await page.goto(`/intern/projecten/${project.id}/discussie`);
  await page.getByLabel("Schrijf een bericht…").fill("Zullen we bij de pier starten?");
  await page.getByRole("button", { name: "Plaatsen" }).click();
  const thread = page.getByRole("article", { name: "Bericht van Wendy Schrijver" });
  await expect(thread).toContainText("Zullen we bij de pier starten?");

  await thread.getByRole("button", { name: "Bewerken" }).click();
  await page.getByLabel("Bericht bewerken").fill("Zullen we bij de Del Perro Pier starten?");
  await page.getByRole("button", { name: "Opslaan" }).click();
  await expect(thread).toContainText("bewerkt");

  const ownerContext = await newClient(browser);
  const ownerPage = await ownerContext.newPage();
  await loginAsStaff(ownerPage, owner);
  await ownerPage.goto(`/intern/projecten/${project.id}/discussie`);
  await ownerPage.getByRole("button", { name: "Reageren" }).click();
  await ownerPage.getByLabel("Reageer op Wendy Schrijver…").fill("Goed plan!");
  await ownerPage.getByRole("button", { name: "Reactie plaatsen" }).click();
  await expect(ownerPage.getByRole("article", { name: "Bericht van Otto Owner" })).toContainText(
    "Goed plan!",
  );
  // Others cannot edit someone else's message.
  await expect(
    ownerPage
      .getByRole("article", { name: "Bericht van Wendy Schrijver" })
      .getByRole("button", { name: "Bewerken" }),
  ).toHaveCount(0);
  await ownerContext.close();

  const adminContext = await newClient(browser);
  const adminPage = await adminContext.newPage();
  await loginAsStaff(adminPage, boss);
  await adminPage.goto(`/intern/projecten/${project.id}/discussie`);
  const reply = adminPage.getByRole("article", { name: "Bericht van Otto Owner" });
  await reply.getByRole("button", { name: "Verwijderen" }).click();
  await reply.getByRole("button", { name: "Ja" }).click();
  await expect(adminPage.getByText("Dit bericht is verwijderd.")).toBeVisible();
  await adminContext.close();
});

test("a suggestion is accepted by the owner and applied", async ({ page, browser }) => {
  const owner = await createStaff("organizer", "Olaf Owner");
  const writer = await createStaff("team_member", "Sanne Suggestie");
  const project = await createProject(owner);

  await loginAsStaff(page, writer);
  await page.goto(`/intern/projecten/${project.id}/discussie`);
  await page.getByLabel("Waarover gaat je voorstel?").selectOption("location");
  await page.getByLabel("Nieuwe waarde: Locatie").fill("Del Perro Pier");
  await page.getByLabel("Toelichting").fill("Mooier uitzicht voor de start");
  await page.getByRole("button", { name: "Suggestie indienen" }).click();
  await expect(page.getByText("Suggestie ingediend.")).toBeVisible();
  // The author cannot decide on their own suggestion.
  await expect(page.getByRole("button", { name: "Accepteren" })).toHaveCount(0);

  const ownerContext = await newClient(browser);
  const ownerPage = await ownerContext.newPage();
  await loginAsStaff(ownerPage, owner);
  await ownerPage.goto(`/intern/projecten/${project.id}/discussie`);
  const card = ownerPage.getByRole("article", { name: "Suggestie van Sanne Suggestie" });
  await expect(card).toContainText("Del Perro Pier");
  await card.getByRole("button", { name: "Accepteren" }).click();
  await expect(card).toContainText("Geaccepteerd");

  await ownerPage.getByRole("link", { name: "Overzicht" }).click();
  await expect(
    ownerPage.getByText("Del Perro Pier").filter({ visible: true }).first(),
  ).toBeVisible();
  await ownerPage.getByRole("link", { name: "Geschiedenis" }).click();
  await expect(ownerPage.getByText("Locatie gewijzigd").filter({ visible: true })).toBeVisible();
  await ownerContext.close();
});

test("suggestions can be rejected or withdrawn", async ({ page, browser }) => {
  const owner = await createStaff("organizer", "Oscar Owner");
  const writer = await createStaff("team_member", "Ward Weger");
  const project = await createProject(owner);
  await admin.from("suggestions").insert([
    {
      project_id: project.id,
      author_id: writer.id,
      field: "capacity",
      proposed_value: "999",
      message: "Meer!",
    },
    { project_id: project.id, author_id: writer.id, message: "Toch maar niet" },
  ]);

  await loginAsStaff(page, writer);
  await page.goto(`/intern/projecten/${project.id}/discussie`);
  const general = page
    .getByRole("article", { name: "Suggestie van Ward Weger" })
    .filter({ hasText: "Toch maar niet" });
  await general.getByRole("button", { name: "Intrekken" }).click();
  await expect(general).toContainText("Ingetrokken");

  const ownerContext = await newClient(browser);
  const ownerPage = await ownerContext.newPage();
  await loginAsStaff(ownerPage, owner);
  await ownerPage.goto(`/intern/projecten/${project.id}/discussie`);
  const capacity = ownerPage
    .getByRole("article", { name: "Suggestie van Ward Weger" })
    .filter({ hasText: "Meer!" });
  await capacity.getByPlaceholder("Toelichting (optioneel)").fill("Te druk op de pier");
  await capacity.getByRole("button", { name: "Afwijzen" }).click();
  await expect(capacity).toContainText("Afgewezen");
  await expect(capacity).toContainText("Te druk op de pier");
  await ownerContext.close();

  const { data: event } = await admin
    .from("events")
    .select("capacity")
    .eq("project_id", project.id)
    .single();
  expect(event?.capacity).toBeNull();
});

test("tasks have their own discussion", async ({ page }) => {
  const owner = await createStaff("organizer", "Teun Taak");
  const project = await createProject(owner);
  const { data: task } = await admin
    .from("tasks")
    .insert({ project_id: project.id, title: "Flyer maken" })
    .select("id")
    .single();

  await loginAsStaff(page, owner);
  await page.goto(`/intern/taken/${task!.id}`);
  await page.getByLabel("Schrijf een bericht…").fill("Wie maakt het ontwerp?");
  await page.getByRole("button", { name: "Plaatsen" }).click();
  await expect(page.getByRole("article", { name: "Bericht van Teun Taak" })).toContainText(
    "Wie maakt het ontwerp?",
  );
});
