import { expect, test, type Page } from "@playwright/test";
import { admin, createStaff, loginAsStaff, useRandomIp, type TestUser } from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await useRandomIp(context);
});

async function projectWithMembers(
  owner: TestUser,
  members: Array<{ user: TestUser; permission: "editor" | "commenter" }>,
) {
  const { data: project, error } = await admin
    .from("projects")
    .insert({ title: `Takenproject ${Date.now()}`, owner_id: owner.id })
    .select("id, title")
    .single();
  if (error) throw error;
  await admin
    .from("events")
    .insert({ project_id: project.id, title: project.title, slug: `taken-${Date.now()}` });
  if (members.length) {
    await admin
      .from("project_members")
      .insert(
        members.map((member) => ({
          project_id: project.id,
          staff_id: member.user.id,
          permission: member.permission,
        })),
      );
  }
  return project;
}

function column(page: Page, name: string) {
  return page.getByRole("region", { name });
}

test("tasks flow from editor to assignee across the board", async ({ page, browser }) => {
  const owner = await createStaff("organizer", "Tom Taakgever");
  const assignee = await createStaff("team_member", `Ada Uitvoerder ${Date.now()}`);
  const project = await projectWithMembers(owner, []);

  await loginAsStaff(page, owner);
  await page.goto(`/intern/projecten/${project.id}/taken`);
  await page.getByLabel("Titel").fill("Bekers bestellen");
  await page.getByLabel("Verantwoordelijke").selectOption({ label: assignee.name });
  await page.getByLabel("Prioriteit").selectOption("high");
  await page.getByRole("button", { name: "Taak toevoegen" }).click();
  await expect(page.getByText("Taak toegevoegd.")).toBeVisible();
  await expect(
    column(page, "Te doen").getByRole("link", { name: "Bekers bestellen" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Bekers bestellen" }).click();
  await page.getByPlaceholder("Nieuw punt…").fill("Gouden beker");
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await expect(page.getByRole("checkbox", { name: "Gouden beker" })).toBeVisible();

  // The assignee (no edit rights) can progress the task and tick its checklist.
  const assigneeContext = await browser.newContext();
  const assigneePage = await assigneeContext.newPage();
  await loginAsStaff(assigneePage, assignee);
  await assigneePage
    .getByRole("navigation", { name: "Hoofdmenu" })
    .getByRole("link", { name: "Taken" })
    .click();
  await expect(
    column(assigneePage, "Te doen").getByRole("link", { name: "Bekers bestellen" }),
  ).toBeVisible();
  await assigneePage.getByRole("button", { name: "Bekers bestellen: Starten" }).click();
  await expect(
    column(assigneePage, "Bezig").getByRole("link", { name: "Bekers bestellen" }),
  ).toBeVisible();

  await assigneePage.getByRole("link", { name: "Bekers bestellen" }).click();
  await expect(assigneePage.getByRole("button", { name: "Taak bewerken" })).toHaveCount(0);
  await assigneePage.getByRole("checkbox", { name: "Gouden beker" }).click();
  await expect(assigneePage.getByRole("checkbox", { name: "Gouden beker" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await assigneePage.getByRole("button", { name: 'Naar "Klaar"' }).click();
  await expect(assigneePage.getByText("Afgerond:")).toBeVisible();
  await assigneeContext.close();
});

test("other staff see tasks but cannot move them", async ({ page }) => {
  const owner = await createStaff("organizer");
  const reader = await createStaff("team_member", "Ruud Lezer");
  const project = await projectWithMembers(owner, [{ user: reader, permission: "commenter" }]);
  await admin
    .from("tasks")
    .insert({ project_id: project.id, title: "Niet van jou", assignee_id: owner.id });

  await loginAsStaff(page, reader);
  await page.goto("/intern/taken?weergave=alle");
  await expect(page.getByRole("link", { name: "Niet van jou" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Niet van jou: Starten" })).toHaveCount(0);

  await page.goto(`/intern/projecten/${project.id}/taken`);
  await expect(page.getByRole("button", { name: "Taak toevoegen" })).toHaveCount(0);
});

test("overdue tasks are marked and editors can edit and delete tasks", async ({ page }) => {
  const owner = await createStaff("organizer");
  const project = await projectWithMembers(owner, []);
  const { data: task } = await admin
    .from("tasks")
    .insert({
      project_id: project.id,
      title: "Te laat ding",
      due_at: "2026-01-01T12:00:00Z",
      assignee_id: owner.id,
    })
    .select("id")
    .single();

  await loginAsStaff(page, owner);
  await page.goto("/intern/taken");
  await expect(page.getByRole("listitem").filter({ hasText: "Te laat ding" })).toContainText(
    "Te laat:",
  );

  await page.goto(`/intern/taken/${task!.id}`);
  await page.getByRole("button", { name: "Taak bewerken" }).click();
  await page.getByLabel("Titel").fill("Te laat ding (aangepast)");
  await page.getByRole("button", { name: "Taak opslaan" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Te laat ding (aangepast)" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Verwijderen" }).click();
  await page.getByRole("button", { name: "Ja, verwijderen" }).click();
  await expect(page).toHaveURL(new RegExp(`/intern/projecten/${project.id}/taken$`));
  await expect(page.getByRole("link", { name: "Te laat ding (aangepast)" })).toHaveCount(0);
});
