import { test, expect } from "@playwright/test";
import { makeTestUser, deleteUser, registerViaUI } from "./helpers";

test.describe("Plan restrictions", () => {
  const freeUser = makeTestUser("free");

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await registerViaUI(page, freeUser);
    // Default plan is 'free', no need to override
    await ctx.close();
  });

  test.afterAll(() => {
    deleteUser(freeUser.email);
  });

  test("user free: GET /api/alerts renvoie 403", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", freeUser.email);
    await page.fill("#password", freeUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const res = await page.request.get("/api/alerts");
    expect(res.status()).toBe(403);
  });

  test("user free: onglet Alertes affiche bloqueur upgrade", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", freeUser.email);
    await page.fill("#password", freeUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard/parametres?tab=alerts");
    await expect(page.getByText(/Passez au plan Solo/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Voir les offres/i })).toBeVisible();
  });

  test("user free: POST /api/alerts renvoie 403", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", freeUser.email);
    await page.fill("#password", freeUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const res = await page.request.post("/api/alerts", {
      data: { name: "test", keywords: ["formation"], frequency: "daily" },
    });
    expect(res.status()).toBe(403);
  });
});
