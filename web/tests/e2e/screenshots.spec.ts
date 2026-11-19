// Captures doc 09 §8 screenshots into docs/screenshots (run: npx tsx or node via playwright test runner below).
import { test } from "@playwright/test";

const OUT = "../docs/screenshots";
test("capture submission screenshots", async ({ page }) => {
  test.skip(!process.env.AMANSHIFT_SCREENSHOTS, "set AMANSHIFT_SCREENSHOTS=1 to capture");
  const step = (n: number) => page.getByRole("button", { name: `Do step ${n}` }).click();
  await page.goto("/command?judge=1");
  await page.addStyleTag({ content: ".planbar{position:static!important}" });
  await step(1);
  await page.locator(".planbar").getByText("APPROVED").waitFor();
  await page.locator("#crews-h").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/1-s2-normal.png`, fullPage: true });
  await step(2);
  await page.getByText("No reachable rest resource").waitFor();
  await page.screenshot({ path: `${OUT}/2-s2-r2-failure.png`, fullPage: true });
  await step(3);
  await step(4);
  await page.locator(".verdict-no[role=status]").waitFor();
  await page.locator("#chk-h").scrollIntoViewIfNeeded();
  await page.locator("section[aria-labelledby=chk-h]").screenshot({ path: `${OUT}/3-s8-rejection.png` });
  await step(5);
  await page.locator(".banner.hatch").first().waitFor();
  await page.locator(".banners").screenshot({ path: `${OUT}/5-s10-offline.png` });
  for (const lang of ["bn", "ar"]) {
    await page.goto("/cards");
    await page.locator("header select").selectOption(lang);
    await page.locator(".wcard").first().waitFor();
    await page.screenshot({ path: `${OUT}/4-s9-cards-${lang}.png`, fullPage: true });
  }
  await page.locator("header select").selectOption("en");
  await page.goto("/evidence");
  await page.getByText("Fail-safe property tests").waitFor();
  await page.screenshot({ path: `${OUT}/6-s11-evidence.png`, fullPage: true });
  await page.goto("/method");
  await page.screenshot({ path: `${OUT}/7-s12-limitations.png`, fullPage: true });
});
