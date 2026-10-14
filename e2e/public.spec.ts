import { expect, test } from "@playwright/test";

test("the public home page shows no internal navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Nog geen evenementen gepubliceerd")).toBeVisible();
  await expect(page.locator('a[href^="/intern"]')).toHaveCount(0);
  await expect(page.locator('a[href="/login"]')).toHaveCount(0);
});

test("security headers are set", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("token links never leak via the Referer header", async ({ request }) => {
  const response = await request.get("/activeren?t=abcdefghijkl");
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("robots.txt keeps internal pages out of search engines", async ({ request }) => {
  const body = await (await request.get("/robots.txt")).text();
  expect(body).toContain("Disallow: /intern");
  expect(body).toContain("Disallow: /login");
});
