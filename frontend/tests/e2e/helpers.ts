import { Page, APIRequestContext, expect } from "@playwright/test";
import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "..", "data", "veille.db");

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export function makeTestUser(suffix: string): TestUser {
  const ts = Date.now();
  return {
    email: `e2e-${suffix}-${ts}@test.local`,
    password: "E2ePassword123!",
    firstName: "E2E",
    lastName: suffix,
  };
}

export async function registerViaUI(page: Page, user: TestUser) {
  await page.goto("/inscription");
  await page.fill("#firstName", user.firstName);
  await page.fill("#lastName", user.lastName);
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.fill("#confirmPassword", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

export async function registerViaApi(request: APIRequestContext, user: TestUser) {
  const res = await request.post("/api/auth/register", {
    data: {
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });
  expect(res.status()).toBe(200);
}

export async function loginViaUI(page: Page, user: TestUser) {
  await page.goto("/connexion");
  await page.fill("#email", user.email);
  await page.fill("#password", user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

export function setUserPlan(email: string, plan: "free" | "solo" | "equipe" | "agence") {
  const db = new Database(DB_PATH);
  try {
    db.prepare("UPDATE users SET plan = ? WHERE email = ?").run(plan, email.toLowerCase());
  } finally {
    db.close();
  }
}

export function deleteUser(email: string) {
  const db = new Database(DB_PATH);
  try {
    const row = db.prepare("SELECT id FROM users WHERE email = ?").get(email.toLowerCase()) as { id: number } | undefined;
    if (!row) return;
    const uid = row.id;
    db.prepare("DELETE FROM user_profiles WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM alerts WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM export_logs WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM external_contents WHERE user_id = ?").run(uid);
    db.prepare("DELETE FROM team_members WHERE user_id = ? OR invited_by = ?").run(uid, uid);
    db.prepare("DELETE FROM team_invitations WHERE invited_by = ?").run(uid);
    db.prepare("DELETE FROM teams WHERE owner_id = ?").run(uid);
    db.prepare("DELETE FROM users WHERE id = ?").run(uid);
  } finally {
    db.close();
  }
}
