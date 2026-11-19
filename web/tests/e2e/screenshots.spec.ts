// Captures submission screenshots (doc 09 §8, doc 13) into docs/screenshots. Earlier versions: docs/screenshots/v1-rc1, v1.1.
import { test, type Page } from "@playwright/test";

const OUT = "../docs/screenshots";
const shot = (page: Page, name: string, fullPage = false) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
const bar = (page: Page, name: string) => page.locator(".tour-bar").getByRole("button", { name }).click();

test("capture submission screenshots", async ({ page }) => {
  test.skip(!process.env.AMANSHIFT_SCREENSHOTS, "set AMANSHIFT_SCREENSHOTS=1 to capture");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(800);
  await shot(page, "01-home");
  await page.goto("/tour");
  await bar(page, "Start the shift");
  await page.locator(".briefing").waitFor();
  await page.goto("/app");
  await page.locator(".briefing").waitFor();
  await shot(page, "02-overview-morning");
  await page.goto("/tour");
  for (const n of ["Start the shift", "Next chapter", "Report the outage"]) await bar(page, n);
  await page.locator(".briefing").getByText("Central cooled rest cabin unavailable").waitFor();
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "03-tour-cooling-outage");
  await page.goto("/app");
  await page.locator(".briefing").waitFor();
  await shot(page, "04-overview-outage");
  await page.goto("/app/worksite?sel=resource:R2");
  await page.locator(".drawer").waitFor();
  await page.waitForTimeout(300);
  await shot(page, "05-worksite-outage-detail");
  await page.goto("/app/protection?tab=plan");
  await page.waitForTimeout(500);
  await shot(page, "06-protection-previous-plan");
  await page.goto("/tour");
  for (const n of ["Start the shift", "Next chapter", "Report the outage", "Next chapter", "Inspect the outage"]) await bar(page, n);
  await page.keyboard.press("Escape");
  for (const n of ["Next chapter", "Generate revised plan", "Next chapter", "Re-submit previous arrangement"]) await bar(page, n);
  await page.locator("#us-h").waitFor();
  await page.mouse.move(0, 0);
  await shot(page, "07-tour-previous-arrangement-rejected", true);
  await page.goto("/app/protection");
  await page.waitForTimeout(500);
  await shot(page, "08-protection-interventions");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [lang, name] of [["English", "en"], ["العربية", "ar"], ["বাংলা", "bn"]]) {
    await page.goto("/worker");
    await page.getByRole("button", { name: lang, exact: true }).click();
    await page.locator(".wk-card").waitFor();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await shot(page, `09-worker-${name}`);
  }
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.goto("/app");
  await page.locator(".briefing").waitFor();
  await shot(page, "10-overview-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/help/validation");
  await page.getByText("Fail-safe property tests").waitFor();
  await shot(page, "11-technical-validation");
});
