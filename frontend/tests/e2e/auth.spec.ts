import { test, expect } from "@playwright/test";
import { makeTestUser, deleteUser, registerViaUI, loginViaUI } from "./helpers";

test.describe("Auth flow", () => {
  const user = makeTestUser("auth");

  test.afterAll(() => {
    deleteUser(user.email);
  });

  test("inscription -> dashboard -> logout -> login", async ({ page }) => {
    // Inscription
    await registerViaUI(page, user);
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify session active via /api/auth/me
    const meRes = await page.request.get("/api/auth/me");
    expect(meRes.ok()).toBe(true);
    const me = await meRes.json();
    expect(me.user?.email).toBe(user.email.toLowerCase());

    // Logout
    await page.request.post("/api/auth/logout");

    // Dashboard must redirect when unauth
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/connexion/);

    // Login
    await loginViaUI(page, user);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("registration rejects duplicate email", async ({ page }) => {
    const dup = makeTestUser("dup");
    await registerViaUI(page, dup);

    // Second attempt with same email
    await page.request.post("/api/auth/logout");
    const res = await page.request.post("/api/auth/register", {
      data: {
        email: dup.email,
        password: dup.password,
        firstName: dup.firstName,
        lastName: dup.lastName,
      },
    });
    expect(res.status()).toBe(409);

    deleteUser(dup.email);
  });

  test("dashboard redirects unauth user to /connexion", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/dashboard/veille");
    await expect(page).toHaveURL(/\/connexion/);
  });
});
