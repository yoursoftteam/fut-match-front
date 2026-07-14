import { test, expect } from "@playwright/test";

test("manifest is served with correct content-type", async ({ page }) => {
  const response = await page.goto("/manifest.webmanifest");
  expect(response?.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const manifest = await response?.json();
  expect(manifest.name).toContain("Parti2");
  expect(manifest.display).toBe("standalone");
  expect(manifest.theme_color).toBe("#22C55E");
});

test("theme-color meta tag exists", async ({ page }) => {
  await page.goto("/");
  const meta = page.locator('meta[name="theme-color"]');
  await expect(meta).toHaveAttribute("content", "#22C55E");
});

test("apple-touch-icon link exists", async ({ page }) => {
  await page.goto("/");
  const link = page.locator('link[rel="apple-touch-icon"]');
  await expect(link).toHaveAttribute("href", "/icons/apple-icon-180x180.png");
});

test("mobile-web-app-capable meta exists", async ({ page }) => {
  await page.goto("/");
  const meta = page.locator('meta[name="mobile-web-app-capable"]');
  await expect(meta).toHaveAttribute("content", "yes");
});

test("icon-192 is accessible", async ({ page }) => {
  const response = await page.goto("/icons/icon-192x192.png");
  expect(response?.ok()).toBe(true);
});

test("icon-512 is accessible", async ({ page }) => {
  const response = await page.goto("/icons/icon-512x512.png");
  expect(response?.ok()).toBe(true);
});

test("apple-icon-180 is accessible", async ({ page }) => {
  const response = await page.goto("/icons/apple-icon-180x180.png");
  expect(response?.ok()).toBe(true);
});

test("CSP includes worker-src", async ({ page }) => {
  const response = await page.goto("/");
  const csp = response?.headers()["content-security-policy"];
  expect(csp).toContain("worker-src 'self'");
});

test("Link header points to manifest", async ({ page }) => {
  const response = await page.goto("/");
  const link = response?.headers()["link"];
  expect(link).toContain("manifest.webmanifest");
});
