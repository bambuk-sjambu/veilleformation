import { test, expect } from "@playwright/test";
import { makeTestUser, deleteUser, registerViaUI, setUserPlan } from "./helpers";

test.describe("Export PDF Audit Qualiopi", () => {
  const user = makeTestUser("export");

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await registerViaUI(page, user);
    setUserPlan(user.email, "solo");
    await ctx.close();
  });

  test.afterAll(() => {
    deleteUser(user.email);
  });

  test("generation PDF via API endpoint", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const today = new Date().toISOString().split("T")[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const res = await page.request.get(
      `/api/export/audit?date_start=${monthAgo}&date_end=${today}`
    );
    expect(res.ok()).toBe(true);
    expect(res.headers()["content-type"]).toContain("application/pdf");

    const buf = await res.body();
    expect(buf.length).toBeGreaterThan(1000);
    // Signature PDF
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
  });

  test("page export rend le formulaire", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard/export");
    await expect(page.locator('input[type="date"]')).toHaveCount(2);
    await expect(page.getByRole("button", { name: /Telecharger le PDF|Télécharger le PDF/i })).toBeVisible();
  });
});
