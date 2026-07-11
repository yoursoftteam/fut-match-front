import { test, expect } from "@playwright/test";

test("SW registers on page load", async ({ page }) => {
  await page.goto("/");
  const registrations = await page.evaluate(() =>
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.map((r) => ({
        scope: r.scope,
        active: !!r.active,
      })),
    ),
  );
  expect(registrations.length).toBeGreaterThanOrEqual(1);
  expect(registrations[0].scope).toContain("/");
});

test("SW is activated after load", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(2000);
  const isActive = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return reg?.active?.state === "activated";
  });
  expect(isActive).toBe(true);
});

test("precache contains critical URLs after install", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(1000);
  const cacheKeys = await page.evaluate(async () => {
    const cache = await caches.open("parti2-static-v1");
    const keys = await cache.keys();
    return keys.map((r) => r.url);
  });
  expect(
    cacheKeys.some((url) => url.includes("offline.html")),
  ).toBe(true);
  expect(
    cacheKeys.some((url) => url.includes("manifest.webmanifest")),
  ).toBe(true);
  expect(
    cacheKeys.some((url) => url.includes("icon-192x192.png")),
  ).toBe(true);
});

test("UpdateToast is not visible initially", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.locator("text=Nueva version disponible"),
  ).not.toBeVisible();
});

test("sw.js is served with correct content-type", async ({ page }) => {
  const response = await page.goto("/sw.js");
  expect(response?.headers()["content-type"]).toContain("javascript");
});

test("offline.html is accessible", async ({ page }) => {
  const response = await page.goto("/offline.html");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("h1")).toContainText("sin conexion");
});
