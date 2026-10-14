import { randomInt, randomUUID } from "node:crypto";
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

async function plannedProject(owner: TestUser, title: string, startsAt: string, endsAt: string) {
  const { data: project, error } = await admin
    .from("projects")
    .insert({ title, owner_id: owner.id, status: "in_preparation" })
    .select("id")
    .single();
  if (error) throw error;
  const { error: eventError } = await admin.from("events").insert({
    project_id: project.id,
    title,
    slug: `plan-${randomUUID()}`,
    starts_at: startsAt,
    ends_at: endsAt,
    location: "Legion Square",
  });
  if (eventError) throw eventError;
  return project;
}

test("the calendar combines events, deadlines and team activities", async ({ page }) => {
  const owner = await createStaff("organizer", "Petra Planner");
  const title = `Kerstrace ${Date.now()}`;
  // A random far-future year keeps the month view free of other local data.
  const year = randomInt(2100, 9000);
  const project = await plannedProject(
    owner,
    title,
    `${year}-01-15T19:00:00Z`,
    `${year}-01-15T21:00:00Z`,
  );
  await admin.from("tasks").insert({
    project_id: project.id,
    title: `Prijzen kopen ${title}`,
    due_at: `${year}-01-12T18:00:00Z`,
    assignee_id: owner.id,
  });

  await loginAsStaff(page, owner);
  await page
    .getByRole("navigation", { name: "Hoofdmenu" })
    .getByRole("link", { name: "Planning" })
    .click();
  await page.goto(`/intern/planning?weergave=maand&datum=${year}-01-01`);
  await expect(page.getByRole("heading", { name: `januari ${year}` })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`20:00 ${title}`) })).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(`19:00 Prijzen kopen ${title}`) }),
  ).toBeVisible();

  await page.getByText("Teamactiviteit inplannen").click();
  await page.getByLabel("Titel").fill(`Teamoverleg ${title}`);
  await page.getByLabel("Start").fill(`${year}-01-20T20:00`);
  await page.getByLabel("Locatie").fill("Clubhuis");
  await page.getByRole("button", { name: "Activiteit inplannen" }).click();
  await expect(page.getByText("Activiteit ingepland.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(`20:00 Teamoverleg ${title}`) }),
  ).toBeVisible();

  // Week view and day view show the same data.
  await page.goto(`/intern/planning?weergave=week&datum=${year}-01-15`);
  await expect(page.getByRole("link", { name: new RegExp(`20:00 ${title}`) })).toBeVisible();
  await page.goto(`/intern/planning?weergave=dag&datum=${year}-01-15`);
  await expect(page.getByRole("heading", { name: new RegExp(`15 januari ${year}`) })).toBeVisible();
  await expect(
    page.getByRole("link", { name: new RegExp(`20:00 ${title}`) }).locator(".."),
  ).toContainText("In voorbereiding · Legion Square");
});

test("an editor moves an event and its end time moves along", async ({ page }) => {
  const owner = await createStaff("organizer");
  const title = `Verplaatsrace ${Date.now()}`;
  const project = await plannedProject(
    owner,
    title,
    "2027-02-05T19:00:00Z",
    "2027-02-05T21:30:00Z",
  );

  await loginAsStaff(page, owner);
  await page.goto("/intern/planning?weergave=dag&datum=2027-02-05");
  await page.getByRole("button", { name: "Verplaatsen" }).click();
  await page.getByLabel(`Nieuwe start voor ${title}`).fill("2027-02-12T21:00");
  await page.getByRole("button", { name: "Verplaatsen" }).click();
  await expect(page.getByText("Niets gepland op deze dag.")).toBeVisible();

  const { data: event } = await admin
    .from("events")
    .select("starts_at, ends_at")
    .eq("project_id", project.id)
    .single();
  expect(new Date(event!.starts_at!).toISOString()).toBe("2027-02-12T20:00:00.000Z");
  expect(new Date(event!.ends_at!).toISOString()).toBe("2027-02-12T22:30:00.000Z");
});

test("only the creator or an organizer changes a team activity", async ({ page, browser }) => {
  const creator = await createStaff("team_member", "Carla Creator");
  const other = await createStaff("team_member", "Otto Ander");
  const { data: activity } = await admin
    .from("team_activities")
    .insert({
      title: `Training ${Date.now()}`,
      starts_at: "2027-03-03T19:00:00Z",
      created_by: creator.id,
    })
    .select("id, title")
    .single();

  const otherContext = await newClient(browser);
  const otherPage = await otherContext.newPage();
  await loginAsStaff(otherPage, other);
  await otherPage.goto(`/intern/planning/activiteiten/${activity!.id}`);
  await expect(otherPage.getByRole("heading", { level: 1, name: activity!.title })).toBeVisible();
  await expect(otherPage.getByRole("button", { name: "Bewerken" })).toHaveCount(0);
  await otherContext.close();

  await loginAsStaff(page, creator);
  await page.goto(`/intern/planning/activiteiten/${activity!.id}`);
  await page.getByRole("button", { name: "Bewerken" }).click();
  await page.getByLabel("Locatie").fill("Sportschool");
  await page.getByRole("button", { name: "Activiteit opslaan" }).click();
  await expect(page.getByText("Sportschool").filter({ visible: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Verwijderen" }).click();
  await page.getByRole("button", { name: "Ja, verwijderen" }).click();
  await expect(page).toHaveURL(/\/intern\/planning$/);
});
