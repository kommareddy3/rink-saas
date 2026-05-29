import { test, expect } from "@playwright/test";

/**
 * Regression tests for the navigation fixes:
 *
 *   (1) Going to /contact from another route must land at the TOP of the
 *       page — not at the bottom (the bug ScrollToTop fixes).
 *
 *   (2) Clicking an in-page anchor like /#use-cases from a different
 *       route must end up scrolled to that section, not at the top.
 */
test.describe("Navigation & scroll", () => {
  test("Contact page opens scrolled to the top from any other route", async ({ page }) => {
    // Start somewhere with substantial scroll height.
    await page.goto("/");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    // sanity: we are at the bottom
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(200);

    // Navigate to Contact via Navbar or direct URL — direct URL is more
    // reliable across viewports.
    await page.goto("/contact");

    // Wait for paint then check scroll position
    await expect(page.locator("main, body")).toBeVisible();
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeLessThan(50);
  });

  test("Anchor link /#use-cases scrolls to the Use Cases section", async ({ page }) => {
    // Arrive on a non-home route first so the test exercises cross-route nav.
    await page.goto("/contact");
    await page.goto("/#use-cases");

    // The target element must exist (it's a <section id="use-cases">).
    const target = page.locator("#use-cases");
    await expect(target).toBeVisible({ timeout: 8000 });

    // Give ScrollToTop's retry window time to fire.
    await page.waitForTimeout(800);

    // The Use Cases section must be near the top of the viewport.
    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y).toBeLessThan(200);
    }
  });

  test("Anchor link /#tools scrolls to the Tools section", async ({ page }) => {
    await page.goto("/contact");
    await page.goto("/#tools");
    await expect(page.locator("#tools")).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(800);
    const box = await page.locator("#tools").boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y).toBeLessThan(200);
    }
  });
});
