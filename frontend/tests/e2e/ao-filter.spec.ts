import { test, expect } from "@playwright/test";
import Database from "better-sqlite3";
import path from "path";
import { makeTestUser, deleteUser, registerViaUI, setUserPlan } from "./helpers";

const DB_PATH = path.join(process.cwd(), "..", "data", "veille.db");

function countAoByRegion(regionName: string): number {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const row = db
      .prepare(
        "SELECT COUNT(*) as n FROM articles WHERE category='ao' AND status='done' AND (json_extract(extra_meta,'$.region') = ? OR json_extract(extra_meta,'$.region') LIKE ?)",
      )
      .get(regionName, `${regionName}%`) as { n: number };
    return row.n;
  } finally {
    db.close();
  }
}

function totalAoDone(): number {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const row = db.prepare("SELECT COUNT(*) as n FROM articles WHERE category='ao' AND status='done'").get() as { n: number };
    return row.n;
  } finally {
    db.close();
  }
}

test.describe("AO filter by region — parité DB↔UI", () => {
  const user = makeTestUser("aoflt");

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await registerViaUI(page, user);
    setUserPlan(user.email, "solo");
    await ctx.close();
  });

  test.afterAll(() => deleteUser(user.email));

  test("compte affiché IDF == compte DB IDF (pas de cap par limit)", async ({ page }) => {
    const expected = countAoByRegion("Ile-de-France");
    const total = totalAoDone();
    test.skip(expected < 5, "Pas assez d'AO IDF en DB pour ce test");

    // Login
    await page.goto("/connexion");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    // Set preferred region via API directly
    const res = await page.request.put("/api/user", {
      data: { preferred_regions: ["ile-de-france"] },
    });
    expect(res.ok()).toBe(true);

    await page.goto("/dashboard/appels-offres");
    // Attendre le compteur filtre
    const counter = page.locator('span:has-text("filtre par region actif")').first();
    await expect(counter).toBeVisible({ timeout: 10_000 });

    // Le compteur affiche "XX AO sur YY"
    const body = await page.locator("body").textContent();
    const match = body?.match(/(\d+)\s*AO\s*sur\s*(\d+)/);
    expect(match, "Compteur 'X AO sur Y' introuvable").toBeTruthy();
    const displayed = parseInt(match![1], 10);
    const totalUI = parseInt(match![2], 10);

    expect(
      displayed,
      `UI affiche ${displayed} AO IDF, DB en a ${expected} avec status=done. Ecart = ${expected - displayed}`,
    ).toBe(expected);
    expect(totalUI).toBe(total);
  });

  test("PACA filtre matche la DB", async ({ page }) => {
    const expected = countAoByRegion("Provence-Alpes-Cote-d'Azur");
    test.skip(expected < 1, "Pas d'AO PACA en DB");

    await page.goto("/connexion");
    await page.fill("#email", user.email);
    await page.fill("#password", user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");

    await page.request.put("/api/user", {
      data: { preferred_regions: ["provence-alpes-cote-dazur"] },
    });

    await page.goto("/dashboard/appels-offres");
    const body = await page.locator("body").textContent();
    const match = body?.match(/(\d+)\s*AO\s*sur\s*(\d+)/);
    expect(match).toBeTruthy();
    const displayed = parseInt(match![1], 10);
    expect(
      displayed,
      `UI affiche ${displayed} AO PACA, DB en a ${expected}`,
    ).toBe(expected);
  });
});
