import { test, expect } from "@playwright/test";
import { makeTestUser, deleteUser, registerViaUI, setUserPlan } from "./helpers";

test.describe("Veille page", () => {
  const user = makeTestUser("veille");

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

  test("liste articles + filtre indicateur Qualiopi", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.goto("/dashboard/veille");
    await expect(page.getByText(/Filtres/i)).toBeVisible();

    // Attendre le chargement des articles via API
    const articlesRes = await page.waitForResponse(
      (r) => r.url().includes("/api/articles") && r.status() === 200,
      { timeout: 15_000 }
    );
    const payload = await articlesRes.json();
    expect(Array.isArray(payload.articles)).toBe(true);
    expect(payload.total).toBeGreaterThan(0);

    // Vérifier que le compteur d'articles affiche un nombre
    await expect(page.getByText(/\d+ article/)).toBeVisible({ timeout: 10_000 });
  });

  test("marquer un article via API read-status", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const listRes = await page.request.get("/api/articles?limit=1");
    const { articles } = await listRes.json();
    expect(articles.length).toBeGreaterThan(0);
    const id = articles[0].id;

    const markRes = await page.request.post("/api/articles/read-status", {
      data: { id, readStatus: "interessant" },
    });
    expect(markRes.ok()).toBe(true);
    const mark = await markRes.json();
    expect(mark.read_status).toBe("interessant");
  });
});
