// Captures submission screenshots (doc 09 §8, doc 12) into docs/screenshots. v1-rc1 originals are kept in docs/screenshots/v1-rc1.
import { test, type Page } from "@playwright/test";

const OUT = "../docs/screenshots";
const shot = (page: Page, name: string, fullPage = true) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
const step = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();

test("capture submission screenshots", async ({ page }) => {
  test.skip(!process.env.AMANSHIFT_SCREENSHOTS, "set AMANSHIFT_SCREENSHOTS=1 to capture");
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.waitForTimeout(500);
  await shot(page, "01-home", false);
  await page.goto("/demo");
  await step(page, "Load scenario");
  await page.getByText("Policy check passed · 10 safety rules").first().waitFor();
  await page.goto("/app");
  await page.locator(".tiles").waitFor();
  await shot(page, "02-overview", false);
  await page.goto("/demo");
  await step(page, "Cooling cabin fails");
  await page.locator(".attention").getByText("Central cooled rest cabin unavailable").waitFor();
  await page.goto("/app/worksite?sel=resource:R2");
  await page.locator(".map-detail h3").waitFor();
  await shot(page, "03-worksite-cooling-failure", false);
  await page.goto("/demo");
  await step(page, "Generate plan");
  await step(page, "Submit old schedule");
  await page.locator("#us-h").waitFor();
  await page.waitForTimeout(400);
  await shot(page, "04-demo-plan-and-rejection");
  await page.goto("/app/alerts");
  await page.waitForTimeout(500);
  await shot(page, "05-alerts-actions", false);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [lang, name] of [["English", "en"], ["العربية", "ar"], ["বাংলা", "bn"]]) {
    await page.goto("/worker");
    await page.getByRole("button", { name: lang, exact: true }).click();
    await page.locator(".wk-card").waitFor();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(400);
    await shot(page, `06-worker-${name}`, false);
  }
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/demo");
  await step(page, "Go offline");
  await page.locator(".banner.hatch").first().waitFor();
  await shot(page, "07-demo-offline", false);
  await page.goto("/help/validation");
  await page.getByText("Fail-safe property tests").waitFor();
  await shot(page, "08-technical-validation", false);
});
