import { createHash, randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { admin, assignRandomIp, createStaff, formAlert, login } from "./support/helpers";

test.beforeEach(async ({ context }) => {
  await assignRandomIp(context);
});

const INVALID = "De link of code klopt niet, is al gebruikt of verlopen.";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/** Same storage scheme as the app: only hashes, code bound to the token. */
async function activationLink(staffId: string, code = "ABCDEFGH") {
  const token = randomBytes(32).toString("base64url");
  const { error } = await admin.from("staff_activations").insert({
    staff_id: staffId,
    token_hash: sha256(token),
    code_hash: sha256(`${token}:${code}`),
  });
  if (error) throw error;
  return { url: `/activeren?t=${token}`, code };
}

async function submit(page: Page, code: string, password = "Gestolen-Account-2026") {
  await page.getByLabel("Activatiecode").fill(code);
  await page.getByLabel("Nieuw wachtwoord").fill(password);
  await page.getByLabel("Herhaal wachtwoord").fill(password);
  await page.getByRole("button", { name: "Account activeren" }).click();
  // The form resets after each attempt (passwords are never kept).
  await expect(page.getByLabel("Nieuw wachtwoord")).toHaveValue("");
}

test("a forwarded link without the code cannot take over the account", async ({ page }) => {
  const staff = await createStaff("team_member", "Fien Forward");
  const { url, code } = await activationLink(staff.id);

  await page.goto(url);
  // Five wrong guesses burn the link…
  for (let attempt = 0; attempt < 5; attempt++) {
    await submit(page, `WRNG${attempt}ABC`.slice(0, 8));
    await expect(formAlert(page)).toContainText(INVALID);
  }
  // …so even the right code no longer works afterwards.
  await submit(page, code);
  await expect(formAlert(page)).toContainText(INVALID);
  await expect(page).toHaveURL(/\/activeren/);

  // The original password still works: nothing was changed.
  await login(page, staff.username, staff.password);
  await expect(page.getByRole("heading", { name: "Welkom, Fien Forward" })).toBeVisible();
});

test("an activation link works only once", async ({ page, browser }) => {
  const staff = await createStaff("team_member", "Olaf Once");
  const { url, code } = await activationLink(staff.id);

  await page.goto(url);
  await submit(page, code, "Eerste-Wachtwoord-2026");
  await expect(page.getByRole("heading", { name: "Welkom, Olaf Once" })).toBeVisible();

  const replayContext = await browser.newContext();
  await assignRandomIp(replayContext);
  const replay = await replayContext.newPage();
  await replay.goto(url);
  await submit(replay, code);
  await expect(formAlert(replay)).toContainText(INVALID);
  await replayContext.close();
});

test("a tampered link is refused", async ({ page }) => {
  await page.goto(`/activeren?t=${"x".repeat(43)}`);
  await submit(page, "ABCDEFGH");
  await expect(formAlert(page)).toContainText(INVALID);
  await page.goto("/activeren?t=kort");
  await submit(page, "ABCDEFGH");
  await expect(formAlert(page)).toContainText(INVALID);
});

test("forgotten passwords go through an administrator", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Wachtwoord vergeten?" }).click();
  await expect(
    page.getByText("Vraag een administrator om een nieuwe activatielink."),
  ).toBeVisible();
});
