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

test("T-E2E-06 judging moment in the product tour", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/command?judge=1");
  await expect(page).toHaveURL(/\/tour$/);
  const bar = page.locator(".tour-bar");
  const next = async (cta: string) => { await bar.getByRole("button", { name: cta }).click(); };

  await next("Start the shift");
  await expect(page.locator("section[aria-labelledby=plan-h]")).toContainText("Policy check passed · 10 safety rules");
  const before = await levels(page);
  expect(new Set(Object.values(before)).size).toBeGreaterThanOrEqual(3);

  await next("Next chapter");
  await next("Report the outage");
  await expect(page.locator(".briefing")).toContainText("Central cooled rest cabin unavailable");
  await expect(page.locator(".briefing")).toContainText("Concrete Pour, Site Logistics");
  const after = await levels(page);
  for (const [k, v] of Object.entries(before)) expect(after[k]).toBeGreaterThanOrEqual(v);
  // Regression: the invalidated plan must not look current anywhere.
  await expect(page.locator("section[aria-labelledby=plan-h]")).toContainText("Previous plan");
  await expect(page.locator("section[aria-labelledby=plan-h]")).not.toContainText("Policy check passed");
  for (const crew of ["Concrete Pour", "Site Logistics"]) {
    const row = page.locator(".priority li", { hasText: crew });
    await expect(row).toContainText("Stop work");
    await expect(row).not.toContainText("Central cooled rest cabin");
  }
  const cards = await (await page.request.get("/api/v1/sites/demo-site-a/cards")).json();
  for (const c of cards.data.cards.filter((x: { crew_id: string }) => ["C2", "C5"].includes(x.crew_id))) {
    expect(c.key).toBe("stop");
    expect(c.rest).not.toBe("R2");
  }

  await next("Next chapter");
  await next("Inspect the outage");
  await expect(page.locator(".drawer")).toContainText("Impact now");
  await page.keyboard.press("Escape");

  await next("Next chapter");
  await next("Generate revised plan");
  await expect(page.getByText(/No adequate protection arrangement exists for/)).toBeVisible();
  await expect(page.locator("section[aria-labelledby=plan-h]")).toContainText("Policy check passed · 10 safety rules");

  await next("Next chapter");
  await next("Re-submit previous arrangement");
  await expect(page.locator("#us-h")).toBeVisible();
  await expect(page.getByText("Rejected by the policy check")).toBeVisible();
  await expect(page.getByText(/Central cooled rest cabin \(R2\) is unavailable/).first()).toBeVisible();

  await next("Next chapter");
  await next("Disconnect the network");
  await expect(page.locator(".banner.hatch").first()).toContainText("Offline", { timeout: 5000 });
  const offline = await levels(page);
  for (const [k, v] of Object.entries(after)) expect(offline[k]).toBeGreaterThanOrEqual(v);

  await next("Open technical validation");
  await expect(page.getByText("Fail-safe property tests")).toBeVisible();
  await expect(page.getByText("Day-ahead warning skill")).toBeVisible();
  expect(errors).toEqual([]);
});

test("T-UI-01 smoke, legacy routes and no individual data", async ({ page }) => {
  for (const path of ["/", "/app", "/app/worksite", "/app/protection", "/app/protection?tab=plan", "/app/protection?tab=resources", "/app/protection?tab=crews", "/app/activity", "/tour", "/worker", "/help", "/help/method"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer").last()).toContainText(/not diagnosis or work authorization/i);
  }
  for (const [legacy, now] of [["/command", "/app"], ["/cards", "/worker"], ["/evidence", "/help/validation"], ["/method", "/help/method"], ["/demo", "/tour"], ["/app/alerts", "/app/protection"], ["/app/crews", "/app/protection\\?tab=crews"], ["/app/resources", "/app/protection\\?tab=resources"]]) {
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
  for (const path of ["/", "/app", "/app/protection", "/app/protection?tab=plan", "/app/worksite", "/worker", "/tour", "/help/validation"]) {
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
  for (const path of ["/", "/app", "/app/protection", "/app/worksite", "/worker", "/tour", "/help/validation"]) {
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
  await page.evaluate(async () => { await navigator.serviceWorker.ready; }); // shell precached
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) await page.reload(); // let the new worker take control
  await page.locator(".tiles").waitFor();
  await page.waitForTimeout(1500); // offline pack stored
  await context.setOffline(true);
  await expect(page.locator(".banner.hatch").first()).toContainText(/Offline|STOP-HOLD/, { timeout: 5000 });
  await page.reload();
  await expect(page.locator(".side .brand")).toBeVisible();
  await context.setOffline(false);
});
