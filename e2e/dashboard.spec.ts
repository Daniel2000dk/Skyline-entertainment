import { randomInt, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, createStaff, loginAsStaff, assignRandomIp } from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

test("the dashboard shows real figures for the chosen period", async ({ page }) => {
  const owner = await createStaff("organizer", "Dirk Dashboard");
  const title = `Dashboardrace ${Date.now()}`;
  // A random far-future year keeps this test independent of other local data.
  const year = randomInt(2100, 9000);
  const { data: project } = await admin
    .from("projects")
    .insert({ title, owner_id: owner.id, status: "idea" })
    .select("id")
    .single();
  await admin.from("events").insert({
    project_id: project!.id,
    title,
    slug: `dash-${randomUUID()}`,
    starts_at: `${year}-05-20T19:00:00Z`,
  });
  await admin.from("projects").update({ status: "completed" }).eq("id", project!.id);
  await admin
    .from("tasks")
    .insert({ project_id: project!.id, title: "Dashboardtaak", assignee_id: owner.id });

  await loginAsStaff(page, owner);
  await expect(page.getByRole("region", { name: "Kerncijfers" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Openstaande taken/ })).toContainText(/\d/);

  // A custom period that only contains our event.
  await page.getByLabel("Van").fill(`${year}-05-01`);
  await page.getByLabel("Tot en met").fill(`${year}-05-31`);
  await page.getByRole("button", { name: "Toepassen" }).click();
  await expect(page).toHaveURL(new RegExp(`periode=eigen&van=${year}-05-01&tot=${year}-05-31`));
  await expect(page.getByText(/^Periode: .* 1 mei – .* 31 mei$/)).toBeVisible();
  const held = page
    .getByRole("region", { name: "Kerncijfers" })
    .getByText("Gehouden evenementen")
    .locator("..");
  await expect(held).toContainText("1");

  await page.getByText("Toon als tabel").click();
  await expect(page.getByRole("row", { name: "20 mei 1" })).toBeVisible();

  // Recent activity is shown in Dutch (exact wording is covered by unit tests).
  await expect(page.getByRole("heading", { name: "Recente projectactiviteit" })).toBeVisible();

  // Presets and invalid input fall back gracefully.
  await page.getByRole("link", { name: "Jaar" }).click();
  await expect(page).toHaveURL(/periode=jaar/);
  await expect(page.getByRole("heading", { name: "Evenementen per maand" })).toBeVisible();
  await page.goto(`/intern?periode=eigen&van=${year}-06-01&tot=${year}-01-01`);
  await expect(page.getByRole("link", { name: "Maand", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
