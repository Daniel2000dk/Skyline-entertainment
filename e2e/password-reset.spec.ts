import { expect, test } from "@playwright/test";
import {
  createStaff,
  latestResetLink,
  login,
  uniqueEmail,
  assignRandomIp,
  formAlert,
  newClient,
} from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

const SENT =
  "Als dit e-mailadres bij ons bekend is, ontvang je binnen enkele minuten een e-mail met een herstellink.";

test("staff can reset a forgotten password via email", async ({ page, browser }) => {
  const staff = await createStaff("team_member", "Rosa Reset");

  await page.goto("/login");
  await page.getByRole("link", { name: "Wachtwoord vergeten?" }).click();
  await expect(page.getByRole("heading", { name: "Wachtwoord vergeten" })).toBeVisible();
  await page.getByLabel("E-mailadres").fill(staff.email);
  await page.getByRole("button", { name: "Herstellink versturen" }).click();
  await expect(page.getByText(SENT)).toBeVisible();

  const link = await latestResetLink(staff.email);
  const resetContext = await newClient(browser);
  const resetPage = await resetContext.newPage();
  await resetPage.goto(link);
  await resetPage.getByRole("button", { name: "Doorgaan" }).click();

  const newPassword = "Nieuw-Wachtwoord-2026";
  await resetPage.getByLabel("Nieuw wachtwoord").fill(newPassword);
  await resetPage.getByLabel("Herhaal wachtwoord").fill(newPassword);
  await resetPage.getByRole("button", { name: "Wachtwoord opslaan" }).click();
  await expect(resetPage.getByRole("heading", { name: "Welkom, Rosa Reset" })).toBeVisible();
  await resetContext.close();

  // Old password no longer works, the new one does.
  await login(page, staff.email, staff.password);
  await expect(formAlert(page)).toHaveText("E-mailadres of wachtwoord klopt niet.");
  await login(page, staff.email, newPassword);
  await expect(page.getByRole("heading", { name: "Welkom, Rosa Reset" })).toBeVisible();
});

test("the reset form does not reveal whether an account exists", async ({ page }) => {
  await page.goto("/wachtwoord-vergeten");
  await page.getByLabel("E-mailadres").fill(uniqueEmail("bestaat-niet"));
  await page.getByRole("button", { name: "Herstellink versturen" }).click();
  await expect(page.getByText(SENT)).toBeVisible();
});

test("a tampered reset link is refused", async ({ page }) => {
  await page.goto("/bevestigen?token_hash=nep-token-1234567890&type=recovery");
  await page.getByRole("button", { name: "Doorgaan" }).click();
  await expect(formAlert(page)).toContainText("ongeldig, al gebruikt of verlopen");
  await expect(page).toHaveURL(/\/bevestigen/);
});
