import { expect, test } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

test.describe("internal pages without a session", () => {
  for (const path of ["/intern", "/intern/team", "/intern/geen-toegang"]) {
    test(`${path} redirects to login before rendering anything`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      expect(response.headers()["location"]).toContain(`/login?next=${encodeURIComponent(path)}`);
      expect(await response.text()).not.toContain("Medewerkers");
    });
  }

  test("a visitor is sent to the login page", async ({ page }) => {
    await page.goto("/intern/team");
    await expect(page).toHaveURL(/\/login\?next=%2Fintern%2Fteam$/);
    await expect(page.getByRole("heading", { name: "Inloggen" })).toBeVisible();
  });
});

// The public key is designed to be public, so prove it unlocks nothing.
test.describe("direct API calls with the public key", () => {
  const headers = { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${PUBLISHABLE_KEY}` };

  for (const table of [
    "staff_profiles",
    "staff_invitations",
    "projects",
    "project_members",
    "events",
    "activity_log",
  ]) {
    test(`cannot read ${table}`, async ({ request }) => {
      const response = await request.get(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers });
      expect([401, 403]).toContain(response.status());
    });
  }

  test("cannot write to staff_invitations", async ({ request }) => {
    const response = await request.post(`${SUPABASE_URL}/rest/v1/staff_invitations`, {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { email: "hacker@skyline.test", display_name: "Hacker", role: "admin" },
    });
    expect([401, 403]).toContain(response.status());
  });

  test("cannot call the rate limiter", async ({ request }) => {
    const response = await request.post(`${SUPABASE_URL}/rest/v1/rpc/consume_rate_limit`, {
      headers: { ...headers, "Content-Type": "application/json" },
      data: { limit_key: "x", max_hits: 1000, window_seconds: 60 },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("cannot sign up as a new user", async ({ request }) => {
    const response = await request.post(`${SUPABASE_URL}/auth/v1/signup`, {
      headers: { apikey: PUBLISHABLE_KEY, "Content-Type": "application/json" },
      data: { email: "zelf-aanmelden@skyline.test", password: "Zelfaanmelden-2026" },
    });
    expect(response.ok()).toBe(false);
  });
});
