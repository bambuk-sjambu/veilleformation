import { test, expect } from "@playwright/test";
import { makeTestUser, deleteUser, registerViaUI, setUserPlan } from "./helpers";

/**
 * Crawler des liens internes du dashboard : chaque <a href="/..."> doit retourner 2xx/3xx.
 * Attrape les 404 comme le bug "Filtrer par region -> /dashboard/parametres accent".
 */

const PAGES_TO_CRAWL = [
  "/dashboard",
  "/dashboard/veille",
  "/dashboard/appels-offres",
  "/dashboard/plan-action",
  "/dashboard/newsletter",
  "/dashboard/parametres",
  "/dashboard/export",
  "/dashboard/import",
  "/dashboard/abonnement",
];

test.describe("Internal links crawler", () => {
  const user = makeTestUser("links");

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await registerViaUI(page, user);
    setUserPlan(user.email, "agence");
    await ctx.close();
  });

  test.afterAll(() => deleteUser(user.email));

  test("aucun lien interne ne retourne 404", async ({ page }) => {
    await page.goto("/connexion");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    const broken: Array<{ page: string; href: string; status: number }> = [];
    const seen = new Set<string>();

    for (const pageUrl of PAGES_TO_CRAWL) {
      await page.goto(pageUrl);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

      const hrefs = await page
        .locator('a[href^="/"]')
        .evaluateAll((els) => Array.from(new Set(els.map((a) => (a as HTMLAnchorElement).getAttribute("href")!))).filter(Boolean));

      for (const href of hrefs) {
        if (!href || seen.has(href)) continue;
        if (href.startsWith("/api/") || href.includes("#") || href.startsWith("/_")) continue;
        seen.add(href);

        const res = await page.request.get(href, { maxRedirects: 5 });
        if (res.status() >= 400) {
          broken.push({ page: pageUrl, href, status: res.status() });
        }
      }
    }

    if (broken.length > 0) {
      console.error("Liens casses :", broken);
    }
    expect(broken, `${broken.length} lien(s) casse(s) detecte(s)`).toEqual([]);
  });
});
