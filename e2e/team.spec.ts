import { expect, test } from "@playwright/test";
import {
  admin,
  createStaff,
  login,
  loginAsStaff,
  uniqueUsername,
  assignRandomIp,
  formAlert,
  newClient,
} from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

test("an admin adds an Event Manager by username who activates with link + code", async ({
  page,
  browser,
}) => {
  const adminUser = await createStaff("admin", "Ines Inviter");
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const username = uniqueUsername("noah");
  await page.getByLabel("Naam", { exact: true }).fill("Noah Nieuw");
  await page.getByLabel("Gebruikersnaam", { exact: true }).fill(username.toUpperCase());
  await page.getByLabel("Rol", { exact: true }).selectOption("organizer");
  await page.getByRole("button", { name: "Toevoegen" }).click();

  await expect(page.getByText("Noah Nieuw is toegevoegd.")).toBeVisible();
  const link = await page.getByRole("textbox", { name: "Activatielink" }).inputValue();
  const code = await page.getByRole("textbox", { name: "Activatiecode" }).inputValue();
  expect(link).toMatch(/^http:\/\/localhost:3000\/activeren\?t=[\w-]{43}$/);
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  // The same username cannot be given out twice.
  await page.getByLabel("Naam", { exact: true }).fill("Noah Twee");
  await page.getByLabel("Gebruikersnaam", { exact: true }).fill(username);
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await expect(page.getByText("Deze gebruikersnaam is al in gebruik.")).toBeVisible();

  // The invitee uses a separate browser (no shared cookies).
  const inviteeContext = await newClient(browser);
  const invitee = await inviteeContext.newPage();
  await invitee.goto(link);
  await expect(invitee.getByRole("heading", { name: "Account activeren" })).toBeVisible();
  await invitee.getByLabel("Activatiecode").fill(code.toLowerCase());
  await invitee.getByLabel("Nieuw wachtwoord").fill("kort");
  await invitee.getByLabel("Herhaal wachtwoord").fill("kort");
  await invitee.getByRole("button", { name: "Account activeren" }).click();
  await expect(invitee.getByText("Gebruik minimaal 12 tekens.")).toBeVisible();
  await expect(invitee.getByLabel("Activatiecode")).toHaveValue(code.toLowerCase());

  const password = "Paleto-Bay-Rally-2026";
  await invitee.getByLabel("Nieuw wachtwoord").fill(password);
  await invitee.getByLabel("Herhaal wachtwoord").fill(password);
  await invitee.getByRole("button", { name: "Account activeren" }).click();
  await expect(invitee.getByRole("heading", { name: "Welkom, Noah Nieuw" })).toBeVisible();
  await expect(invitee.locator("aside").getByText("Event Manager", { exact: true })).toBeVisible();
  await inviteeContext.close();

  // From now on: username + password.
  const loginContext = await newClient(browser);
  const loginPage = await loginContext.newPage();
  await login(loginPage, username, password);
  await expect(loginPage.getByRole("heading", { name: "Welkom, Noah Nieuw" })).toBeVisible();
  await loginContext.close();
});

test("an admin changes a role and deactivates a member", async ({ page }) => {
  const adminUser = await createStaff("admin", "Ada Admin");
  const member = await createStaff("team_member", `Mila ${Date.now()}`);
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const card = page.getByRole("listitem").filter({ hasText: member.name });
  await card.getByLabel(`Rol van ${member.name}`, { exact: true }).selectOption("organizer");
  await card.getByRole("button", { name: `Rol van ${member.name} opslaan` }).click();
  await expect(card.getByText("Rol opgeslagen.")).toBeVisible();

  const { data: profile } = await admin
    .from("staff_profiles")
    .select("role")
    .eq("id", member.id)
    .single();
  expect(profile?.role).toBe("organizer");

  await card.getByRole("button", { name: "Deactiveren" }).click();
  await card.getByRole("button", { name: "Ja, deactiveren" }).click();
  await expect(card.getByText("Gedeactiveerd", { exact: true })).toBeVisible();

  const memberPage = await page.context().browser()!.newPage();
  await login(memberPage, member.username, member.password);
  await expect(formAlert(memberPage)).toBeVisible();
  await expect(memberPage).toHaveURL(/\/login/);
  await memberPage.close();
});

test("an admin cannot change their own role or access", async ({ page }) => {
  const adminUser = await createStaff("admin", `Sam Self ${Date.now()}`);
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const ownCard = page.getByRole("listitem").filter({ hasText: adminUser.name });
  await expect(ownCard.getByText("Jij")).toBeVisible();
  await expect(ownCard.getByRole("button", { name: "Deactiveren" })).toHaveCount(0);
  await expect(ownCard.getByRole("combobox")).toHaveCount(0);
});

test("an admin renames a member, who then logs in with the new username", async ({
  page,
  browser,
}) => {
  const adminUser = await createStaff("admin", "Rena Rename");
  const member = await createStaff("team_member", `Joep ${Date.now()}`);
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const renamed = uniqueUsername("joep");
  const card = page.getByRole("listitem").filter({ hasText: member.name });
  await card.getByLabel(`Gebruikersnaam van ${member.name}`, { exact: true }).fill(renamed);
  await card.getByRole("button", { name: `Gebruikersnaam van ${member.name} opslaan` }).click();
  await expect(card.getByText("Gebruikersnaam opgeslagen.")).toBeVisible();

  const memberContext = await newClient(browser);
  const memberPage = await memberContext.newPage();
  await login(memberPage, member.username, member.password);
  await expect(formAlert(memberPage)).toHaveText("Gebruikersnaam of wachtwoord klopt niet.");
  await login(memberPage, renamed, member.password);
  await expect(memberPage.getByRole("heading", { name: `Welkom, ${member.name}` })).toBeVisible();
  await memberContext.close();
});

test("a new activation link resets a forgotten password", async ({ page, browser }) => {
  const adminUser = await createStaff("admin", "Lars Link");
  const member = await createStaff("team_member", `Kim ${Date.now()}`);
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const card = page.getByRole("listitem").filter({ hasText: member.name });
  await card.getByRole("button", { name: `Nieuwe activatielink voor ${member.name}` }).click();
  const link = await card
    .getByRole("textbox", { name: `Activatielink voor ${member.name}` })
    .inputValue();
  const code = await card.getByRole("textbox", { name: "Activatiecode" }).inputValue();

  const memberContext = await newClient(browser);
  const memberPage = await memberContext.newPage();
  await memberPage.goto(link);
  const newPassword = "Nieuw-Wachtwoord-2026";
  await memberPage.getByLabel("Activatiecode").fill(code);
  await memberPage.getByLabel("Nieuw wachtwoord").fill(newPassword);
  await memberPage.getByLabel("Herhaal wachtwoord").fill(newPassword);
  await memberPage.getByRole("button", { name: "Account activeren" }).click();
  await expect(memberPage.getByRole("heading", { name: `Welkom, ${member.name}` })).toBeVisible();
  await memberContext.close();

  // Old password no longer works, the new one does.
  const loginContext = await newClient(browser);
  const loginPage = await loginContext.newPage();
  await login(loginPage, member.username, member.password);
  await expect(formAlert(loginPage)).toHaveText("Gebruikersnaam of wachtwoord klopt niet.");
  await login(loginPage, member.username, newPassword);
  await expect(loginPage.getByRole("heading", { name: `Welkom, ${member.name}` })).toBeVisible();
  await loginContext.close();
});
