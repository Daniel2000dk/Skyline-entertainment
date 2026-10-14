import { expect, test, type Page } from "@playwright/test";
import { createStaff, login, assignRandomIp } from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test("public and login pages fit a phone screen", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalScroll(page);
  await page.goto("/login");
  await expectNoHorizontalScroll(page);
});

test("staff can navigate with the mobile menu", async ({ page }) => {
  const staff = await createStaff("admin", "Mobiele Admin");
  await login(page, staff.email, staff.password);
  await expect(page.getByRole("heading", { name: "Welkom, Mobiele Admin" })).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page.getByRole("button", { name: "Menu openen" }).click();
  const menu = page.getByRole("dialog");
  await menu.getByRole("link", { name: "Team" }).click();
  await expect(page).toHaveURL(/\/intern\/team$/);
  await expect(page.getByRole("heading", { name: "Team", level: 1 })).toBeVisible();
  await expectNoHorizontalScroll(page);

  for (const path of ["/intern/planning", "/intern/projecten", "/intern/taken", "/intern/ideeen"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoHorizontalScroll(page);
  }
});
