import { expect, test } from "@playwright/test";
import {
  admin,
  createNonStaffUser,
  createStaff,
  login,
  loginAsStaff,
  uniqueEmail,
  useRandomIp,
  formAlert,
} from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await useRandomIp(context);
});

test("wrong credentials show one generic message", async ({ page }) => {
  const staff = await createStaff("team_member");

  await login(page, staff.email, "Verkeerd-wachtwoord-1");
  await expect(formAlert(page)).toHaveText("E-mailadres of wachtwoord klopt niet.");

  await login(page, uniqueEmail("onbekend"), "Verkeerd-wachtwoord-1");
  await expect(formAlert(page)).toHaveText("E-mailadres of wachtwoord klopt niet.");
});

test("an admin can log in, sees Team and can log out", async ({ page }) => {
  const staff = await createStaff("admin", "Alex Admin");
  await loginAsStaff(page, staff);

  await expect(page).toHaveURL(/\/intern$/);
  await expect(page.getByText("Jouw rol: Administrator")).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Hoofdmenu" });
  await expect(nav.getByRole("link", { name: "Team" })).toBeVisible();

  await page.getByRole("button", { name: "Uitloggen" }).click();
  await expect(page).toHaveURL(/\/login$/);
  // Logging out is a full page load: going back shows no internal page.
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Welkom, Alex Admin" })).toHaveCount(0);
  await expect(page.getByText("Jouw rol: Administrator")).toHaveCount(0);
  await page.goto("/intern");
  await expect(page).toHaveURL(/\/login\?next=%2Fintern$/);
});

test("a Medewerker cannot open admin pages", async ({ page }) => {
  const staff = await createStaff("team_member", "Mo Medewerker");
  await loginAsStaff(page, staff);

  await expect(page.getByText("Jouw rol: Medewerker")).toBeVisible();
  await expect(page.getByRole("link", { name: "Team" })).toHaveCount(0);

  await page.goto("/intern/team");
  await expect(page).toHaveURL(/\/intern\/geen-toegang$/);
  await expect(page.getByRole("heading", { name: "Geen toegang" })).toBeVisible();
  await expect(page.getByText("Medewerker uitnodigen")).toHaveCount(0);
});

test("an Event Manager cannot open admin pages either", async ({ page }) => {
  const staff = await createStaff("organizer", "Eva Eventmanager");
  await loginAsStaff(page, staff);
  await page.goto("/intern/team");
  await expect(page).toHaveURL(/\/intern\/geen-toegang$/);
});

test("an account without invitation gets no access", async ({ page }) => {
  const outsider = await createNonStaffUser();
  await login(page, outsider.email, outsider.password);
  await expect(formAlert(page)).toHaveText(
    "Dit account heeft geen toegang tot het interne systeem.",
  );
  await page.goto("/intern");
  await expect(page).toHaveURL(/\/login/);
});

test("a deactivated staff member cannot log in", async ({ page }) => {
  const staff = await createStaff("team_member");
  await admin.from("staff_profiles").update({ is_active: false }).eq("id", staff.id);
  await admin.auth.admin.updateUserById(staff.id, { ban_duration: "876000h" });

  await login(page, staff.email, staff.password);
  await expect(formAlert(page)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("after login the user returns to the requested internal page", async ({ page }) => {
  const staff = await createStaff("admin", "Robin Return");
  await page.goto("/intern/team");
  await expect(page).toHaveURL(/\/login\?next=%2Fintern%2Fteam$/);
  await page.getByLabel("E-mailadres").fill(staff.email);
  await page.getByLabel("Wachtwoord").fill(staff.password);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/\/intern\/team$/);
});

test("the next parameter cannot redirect to another site", async ({ page }) => {
  const staff = await createStaff("team_member", "Ollie Openredirect");
  await page.goto("/login?next=https://evil.example/intern");
  await page.getByLabel("E-mailadres").fill(staff.email);
  await page.getByLabel("Wachtwoord").fill(staff.password);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL("http://localhost:3000/intern");
});

test("repeated failed logins are throttled", async ({ page }) => {
  const staff = await createStaff("team_member");
  for (let attempt = 0; attempt < 10; attempt++) {
    await login(page, staff.email, `Verkeerd-${attempt}-wachtwoord`);
    await expect(formAlert(page)).toBeVisible();
  }
  // Even the correct password is refused while the account is throttled.
  await login(page, staff.email, staff.password);
  await expect(formAlert(page)).toHaveText(
    "Te veel inlogpogingen. Probeer het over een kwartier opnieuw.",
  );
});
