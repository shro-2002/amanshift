// T-E2E-06 judging moment + T-UI-01..03 + T-OFF-04. Asserts structure, never hard-coded numbers.
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const levels = async (page: Page) => {
  const rows = page.locator("table.crew-table tbody tr");
  const out: Record<string, number> = {};
  for (let i = 0; i < (await rows.count()); i++) {
    const id = (await rows.nth(i).locator("td").first().innerText()).split(/\s/)[0];
    const lvl = Number((await rows.nth(i).locator(".badge .num").innerText()).trim());
    out[id] = lvl;
  }
  return out;
};

test("T-E2E-06 judging moment", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/command?judge=1");
  await page.getByRole("button", { name: "Do step 1" }).click();
  await expect(page.locator(".planbar")).toContainText("APPROVED");
  const before = await levels(page);
  expect(new Set(Object.values(before)).size).toBeGreaterThanOrEqual(3);

  await page.getByRole("button", { name: "Do step 2" }).click();
  await expect(page.getByText("No reachable rest resource: C2, C5")).toBeVisible();
  const after = await levels(page);
  for (const [k, v] of Object.entries(before)) expect(after[k]).toBeGreaterThanOrEqual(v);

  await page.getByRole("button", { name: "Do step 3" }).click();
  await expect(page.locator(".planbar")).toContainText("protection insufficient");
  await expect(page.locator(".planbar")).toContainText("APPROVED");

  await page.getByRole("button", { name: "Do step 4" }).click();
  await expect(page.locator(".verdict-no[role=status]")).toContainText("REJECTED");
  await expect(page.locator(".rules .viol").first()).toBeVisible();
  await expect(page.getByText(/resource R2 is DOWN/).first()).toBeVisible();

  await page.getByRole("button", { name: "Do step 5" }).click();
  await expect(page.locator(".banner.hatch").first()).toContainText("Offline", { timeout: 5000 });
  const offline = await levels(page);
  for (const [k, v] of Object.entries(after)) expect(offline[k]).toBeGreaterThanOrEqual(v);

  await page.getByRole("button", { name: "Do step 6" }).click();
  await expect(page.getByText("Fail-safe property tests")).toBeVisible();
  await expect(page.getByText("Day-ahead warning skill")).toBeVisible();
  expect(errors).toEqual([]);
});

test("T-UI-01 smoke + no individual data", async ({ page }) => {
  for (const path of ["/", "/command", "/cards", "/evidence", "/method"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("footer")).toContainText("not diagnosis or work authorization");
  }
  const body = (await page.content()).toLowerCase();
  for (const banned of ["safe to work", "cleared", "authorized"]) expect(body).not.toContain(banned);
});

test("T-UI-02 RTL for Arabic and Urdu cards", async ({ page }) => {
  for (const lang of ["ar", "ur"]) {
    await page.goto("/cards");
    await page.locator("header select").selectOption(lang);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator(".wcard").first()).toBeVisible();
  }
  await page.locator("header select").selectOption("en");
});

test("T-UI-03 axe: no serious/critical issues on S2, S9, S12", async ({ page }) => {
  for (const path of ["/command", "/cards", "/method"]) {
    await page.goto(path);
    await page.locator("main").waitFor();
    await page.waitForTimeout(800);
    const r = await new AxeBuilder({ page }).analyze();
    const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad.map((v) => `${path}: ${v.id} ${v.nodes.length}`)).toEqual([]);
  }
});

test("NFR-05 320 px: no horizontal page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  for (const path of ["/command", "/cards"]) {
    await page.goto(path);
    await page.locator("main").waitFor();
    await page.waitForTimeout(600);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(over).toBeLessThanOrEqual(1);
  }
});

test("T-OFF-04 offline banner within 5 s and shell from service worker", async ({ page, context }) => {
  await page.goto("/command");
  await page.locator("table.crew-table").waitFor();
  await page.waitForTimeout(1500); // service worker install + pack cached
  await context.setOffline(true);
  await expect(page.locator(".banner.hatch").first()).toContainText(/Offline|STOP-HOLD/, { timeout: 5000 });
  await page.reload();
  await expect(page.locator("header .brand")).toBeVisible();
  await context.setOffline(false);
});
