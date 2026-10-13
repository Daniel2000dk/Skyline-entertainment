import { expect, test } from "@playwright/test";
import {
  admin,
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

test("an admin invites a new Event Manager who sets a password via the link", async ({
  page,
  browser,
}) => {
  const adminUser = await createStaff("admin", "Ines Inviter");
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const email = uniqueEmail("nieuw");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Naam", { exact: true }).fill("Noah Nieuw");
  await page.getByLabel("Rol", { exact: true }).selectOption("organizer");
  await page.getByRole("button", { name: "Uitnodigen" }).click();

  await expect(page.getByText("Noah Nieuw is uitgenodigd als medewerker.")).toBeVisible();
  const link = await page.getByRole("textbox", { name: "Uitnodigingslink" }).inputValue();
  expect(link).toMatch(/^http:\/\/localhost:3000\/bevestigen\?token_hash=[\w-]+&type=invite$/);

  // The invitee uses a separate browser (no shared cookies).
  const inviteeContext = await browser.newContext();
  const invitee = await inviteeContext.newPage();
  await invitee.goto(link);
  await expect(invitee.getByRole("heading", { name: "Welkom bij Skyline" })).toBeVisible();
  await invitee.getByRole("button", { name: "Doorgaan" }).click();

  await expect(invitee).toHaveURL(/\/wachtwoord-instellen$/);
  await invitee.getByLabel("Nieuw wachtwoord").fill("kort");
  await invitee.getByLabel("Herhaal wachtwoord").fill("kort");
  await invitee.getByRole("button", { name: "Wachtwoord opslaan" }).click();
  await expect(invitee.getByText("Gebruik minimaal 12 tekens.")).toBeVisible();

  const password = "Paleto-Bay-Rally-2026";
  await invitee.getByLabel("Nieuw wachtwoord").fill(password);
  await invitee.getByLabel("Herhaal wachtwoord").fill(password);
  await invitee.getByRole("button", { name: "Wachtwoord opslaan" }).click();
  await expect(invitee.getByRole("heading", { name: "Welkom, Noah Nieuw" })).toBeVisible();
  await expect(invitee.getByText("Jouw rol: Event Manager")).toBeVisible();

  // The link is single-use.
  const replayContext = await browser.newContext();
  const replay = await replayContext.newPage();
  await replay.goto(link);
  await replay.getByRole("button", { name: "Doorgaan" }).click();
  await expect(formAlert(replay)).toContainText("ongeldig, al gebruikt of verlopen");

  await inviteeContext.close();
  await replayContext.close();
});

test("an admin changes a role and deactivates a member", async ({ page }) => {
  const adminUser = await createStaff("admin", "Ada Admin");
  const member = await createStaff("team_member", `Mila ${Date.now()}`);
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const card = page.getByRole("listitem").filter({ hasText: member.name });
  await card.getByLabel(`Rol van ${member.name}`).selectOption("organizer");
  await card.getByRole("button", { name: "Opslaan" }).click();
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
  await login(memberPage, member.email, member.password);
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

test("an admin can create a new login link for a member", async ({ page, browser }) => {
  const adminUser = await createStaff("admin", "Lars Link");
  const member = await createStaff("team_member", `Kim ${Date.now()}`);
  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");

  const card = page.getByRole("listitem").filter({ hasText: member.name });
  await card.getByRole("button", { name: `Nieuwe inloglink voor ${member.name}` }).click();
  const link = await card
    .getByRole("textbox", { name: `Inloglink voor ${member.name}` })
    .inputValue();
  expect(link).toContain("type=recovery");

  const memberContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  await memberPage.goto(link);
  await expect(memberPage.getByRole("heading", { name: "Wachtwoord herstellen" })).toBeVisible();
  await memberPage.getByRole("button", { name: "Doorgaan" }).click();
  await expect(memberPage).toHaveURL(/\/wachtwoord-instellen$/);
  await memberContext.close();
});
