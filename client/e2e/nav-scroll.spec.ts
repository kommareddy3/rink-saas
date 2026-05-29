import { test, expect } from "@playwright/test";

/**
 * Regression tests for the navigation fixes.
 *
 * IMPORTANT: these tests must click real SPA <Link>s (or hash anchors),
 * not call page.goto(). page.goto triggers a hard browser navigation,
 * which the browser handles natively — bypassing the React Router code
 * path where the bug actually lives. Using nav clicks is what reproduces
 * the original symptom.
 *
 * Both tests require the latest build (with ScrollToTop mounted in App.jsx)
 * to be deployed at BASE_URL. Running them against a stale prod build will
 * fail by design.
 */
test.describe("Navigation & scroll", () => {
  test("Clicking the navbar 'Contact' link opens the page at the top", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Scroll to the bottom of home.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    const before = await page.evaluate(() => window.scrollY);
    test.skip(before < 100, "Home page is shorter than expected at this viewport");

    // Real SPA navigation via a Link. The navbar may have multiple "Contact"
    // links (header + footer + mobile drawer), so use first().
    await page.getByRole("link", { name: /^contact$/i }).first().click();

    // Wait until we're actually on /contact.
    await page.waitForURL(/\/contact/, { timeout: 10_000 });
    await page.waitForLoadState("domcontentloaded");

    // ScrollToTop should have reset us.
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBeLessThan(80);
  });

  test("Clicking a /#use-cases link from another route scrolls to that section", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("domcontentloaded");

    // The Use Cases anchor lives in the navbar and/or footer as
    // <a href="/#use-cases"> or <Link to="/#use-cases">.
    await page.getByRole("link", { name: /use cases/i }).first().click();
    await page.waitForURL(/\/#use-cases/, { timeout: 10_000 });

    const target = page.locator("#use-cases");
    await expect(target).toBeVisible({ timeout: 8000 });

    // Give ScrollToTop's retry window time to fire.
    await page.waitForTimeout(900);

    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Section should be near the top of the viewport, not below the fold.
      expect(box.y).toBeLessThan(220);
    }
  });

  test("Clicking a /#tools / 'See all tools' link from another route scrolls to that section", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForLoadState("domcontentloaded");

    await page
      .getByRole("link", { name: /tools|see all|features/i })
      .first()
      .click();
    await page.waitForURL(/\/#tools|\/$/, { timeout: 10_000 });

    const target = page.locator("#tools");
    await expect(target).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(900);

    const box = await target.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y).toBeLessThan(220);
    }
  });
});
