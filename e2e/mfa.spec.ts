import { expect, test } from "@playwright/test";
import {
  createStaff,
  enableMfaFor,
  formAlert,
  login,
  loginAsStaff,
  nextTotp,
  totp,
  assignRandomIp,
  newClient,
} from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

const CODE_LABEL = "Code uit je authenticator-app";

test("the TOTP helper matches the RFC 6238 test vector", () => {
  // Secret "12345678901234567890" (base32 below) at T=59s → 94287082 (8 digits).
  expect(totp("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", 59_000)).toBe("287082");
});

test("staff can enable MFA and then need a code to log in", async ({ page }) => {
  test.setTimeout(90_000);
  const staff = await createStaff("admin", "Mira MFA");
  await loginAsStaff(page, staff);

  await page.getByRole("link", { name: "Account" }).first().click();
  await expect(page.getByRole("heading", { name: "Account", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Tweestapsverificatie instellen" }).click();
  await expect(page.getByRole("img", { name: "QR-code voor je authenticator-app" })).toBeVisible();
  const secret = (await page.getByTestId("mfa-secret").textContent())!.trim();

  await page.getByLabel(CODE_LABEL).fill("123");
  await page.getByRole("button", { name: "Bevestigen" }).click();
  await expect(page.getByText("Vul de 6 cijfers uit je authenticator-app in.")).toBeVisible();

  const enrollCode = totp(secret);
  await page.getByLabel(CODE_LABEL).fill(enrollCode);
  await page.getByRole("button", { name: "Bevestigen" }).click();
  await expect(page.getByText("Tweestapsverificatie staat aan. Bij het inloggen")).toBeVisible();

  await page.getByRole("button", { name: "Uitloggen" }).first().click();
  await expect(page).toHaveURL(/\/login$/);

  // Password alone is not enough any more.
  await login(page, staff.username, staff.password);
  await expect(page).toHaveURL(/\/mfa\?next=%2Fintern$/);
  await page.goto("/intern/team");
  await expect(page).toHaveURL(/\/mfa$/);
  // A stolen password must not be enough to change the password either.
  await page.goto("/wachtwoord-instellen");
  await expect(page).toHaveURL(/\/mfa$/);

  await page.getByLabel(CODE_LABEL).fill("000000");
  await page.getByRole("button", { name: "Bevestigen" }).click();
  await expect(formAlert(page)).toContainText("klopt niet of is verlopen");

  await page.getByLabel(CODE_LABEL).fill(await nextTotp(secret, enrollCode));
  await page.getByRole("button", { name: "Bevestigen" }).click();
  await expect(page.getByRole("heading", { name: "Welkom, Mira MFA" })).toBeVisible();

  // Turning it off right after a code login is allowed.
  await page.goto("/intern/account");
  await page.getByRole("button", { name: "Tweestapsverificatie uitzetten" }).click();
  await page.getByRole("button", { name: "Ja, uitzetten" }).click();
  await expect(page.getByRole("button", { name: "Tweestapsverificatie instellen" })).toBeVisible();
});

test("an admin can reset a member's MFA after a lost phone", async ({ page, browser }) => {
  const adminUser = await createStaff("admin", "Rik Reset");
  const member = await createStaff("team_member", `Tess ${Date.now()}`);
  await enableMfaFor(member);

  await loginAsStaff(page, adminUser);
  await page.goto("/intern/team");
  const card = page.getByRole("listitem").filter({ hasText: member.name });
  await expect(card.getByText("2FA aan")).toBeVisible();
  await card.getByRole("button", { name: "2FA resetten" }).click();
  await card.getByRole("button", { name: "Ja, resetten" }).click();
  await expect(card.getByText("2FA aan")).toHaveCount(0);

  const memberContext = await newClient(browser);
  const memberPage = await memberContext.newPage();
  await login(memberPage, member.username, member.password);
  await expect(memberPage.getByRole("heading", { name: `Welkom, ${member.name}` })).toBeVisible();
  await memberContext.close();
});

test("the code page is not reachable without a password login", async ({ page }) => {
  await page.goto("/mfa");
  await expect(page).toHaveURL(/\/login/);
});
