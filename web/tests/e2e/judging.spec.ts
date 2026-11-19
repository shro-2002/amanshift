// T-E2E-06 judging moment (via /demo) + T-UI-01..03 + T-OFF-04 on the redesigned product (doc 12 §9).
// Asserts structure and monotonic levels, never hard-coded numbers.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const STATE = "/api/v1/sites/demo-site-a/state";
const levels = async (page: Page): Promise<Record<string, number>> => {
  const j = await (await page.request.get(STATE)).json();
  return Object.fromEntries(j.data.crews.map((c: { crew_id: string; display_level: number }) => [c.crew_id, c.display_level]));
};
const step = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();

test("T-E2E-06 judging moment in the demonstration environment", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/command?judge=1");
  await expect(page).toHaveURL(/\/demo$/);

  await step(page, "Load scenario");
  await expect(page.locator("#plan-h")).toBeVisible();
  await expect(page.getByText("Policy check passed · 10 safety rules")).toBeVisible();
  const before = await levels(page);
  expect(new Set(Object.values(before)).size).toBeGreaterThanOrEqual(3);

  await step(page, "Cooling cabin fails");
  await expect(page.locator(".attention")).toContainText("Central cooled rest cabin unavailable");
  await expect(page.locator(".attention")).toContainText("Concrete Pour, Site Logistics");
  const after = await levels(page);
  for (const [k, v] of Object.entries(before)) expect(after[k]).toBeGreaterThanOrEqual(v);

  await step(page, "Generate plan");
  await expect(page.getByText(/No adequate protection arrangement exists for/)).toBeVisible();
  await expect(page.getByText("Policy check passed · 10 safety rules")).toBeVisible();

  await step(page, "Submit old schedule");
  await expect(page.locator("#us-h")).toBeVisible();
  await expect(page.getByText("Rejected by the policy check")).toBeVisible();
  await expect(page.getByText(/Central cooled rest cabin \(R2\) is unavailable/).first()).toBeVisible();

  await step(page, "Go offline");
  await expect(page.locator(".banner.hatch").first()).toContainText("Offline", { timeout: 5000 });
  const offline = await levels(page);
  for (const [k, v] of Object.entries(after)) expect(offline[k]).toBeGreaterThanOrEqual(v);

  await step(page, "Open technical validation");
  await expect(page.getByText("Fail-safe property tests")).toBeVisible();
  await expect(page.getByText("Day-ahead warning skill")).toBeVisible();
  expect(errors).toEqual([]);
});

test("T-UI-01 smoke, legacy routes and no individual data", async ({ page }) => {
  for (const path of ["/", "/app", "/app/worksite", "/app/crews", "/app/resources", "/app/alerts", "/app/activity", "/worker", "/help", "/help/method"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer").last()).toContainText(/not diagnosis or work authorization/i);
  }
  for (const [legacy, now] of [["/command", "/app"], ["/cards", "/worker"], ["/evidence", "/help/validation"], ["/method", "/help/method"]]) {
    await page.goto(legacy);
    await expect(page).toHaveURL(new RegExp(`${now}$`));
  }
  await page.goto("/app");
  const body = (await page.content()).toLowerCase();
  for (const banned of ["safe to work", "cleared", "authorized", "submit unsafe plan"]) expect(body).not.toContain(banned);
});

test("T-UI-02 worker app: language switch, RTL for Arabic and Urdu", async ({ page }) => {
  await page.goto("/worker");
  await expect(page.locator(".wk-card")).toBeVisible();
  for (const name of ["العربية", "اردو"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".wk-card .wk-line2").first()).toBeVisible(); // English line second
  }
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
});

test("T-UI-03 axe: no serious/critical issues", async ({ page }) => {
  for (const path of ["/", "/app", "/app/alerts", "/app/worksite", "/worker", "/demo", "/help/validation"]) {
    await page.goto(path);
    await page.locator("main").waitFor();
    await page.waitForTimeout(900);
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${path}: ${v.id} ${v.nodes.length}`)).toEqual([]);
  }
});

test("NFR-05 320 px: no horizontal page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/", "/app", "/app/alerts", "/worker", "/demo", "/help/validation"]) {
    await page.goto(path);
    await page.locator("main").waitFor();
    await page.waitForTimeout(700);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over, path).toBeLessThanOrEqual(1);
  }
});

test("T-OFF-04 offline banner within 5 s and shell from service worker", async ({ page, context }) => {
  await page.goto("/app");
  await page.locator(".tiles").waitFor();
  await page.waitForTimeout(1500); // service worker install + pack cached
  await context.setOffline(true);
  await expect(page.locator(".banner.hatch").first()).toContainText(/Offline|STOP-HOLD/, { timeout: 5000 });
  await page.reload();
  await expect(page.locator(".side .brand")).toBeVisible();
  await context.setOffline(false);
});
