# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: nav-scroll.spec.ts >> Navigation & scroll >> Clicking the navbar 'Contact' link opens the page at the top
- Location: e2e/nav-scroll.spec.ts:17:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * Regression tests for the navigation fixes.
  5  |  *
  6  |  * IMPORTANT: these tests must click real SPA <Link>s (or hash anchors),
  7  |  * not call page.goto(). page.goto triggers a hard browser navigation,
  8  |  * which the browser handles natively — bypassing the React Router code
  9  |  * path where the bug actually lives. Using nav clicks is what reproduces
  10 |  * the original symptom.
  11 |  *
  12 |  * Both tests require the latest build (with ScrollToTop mounted in App.jsx)
  13 |  * to be deployed at BASE_URL. Running them against a stale prod build will
  14 |  * fail by design.
  15 |  */
  16 | test.describe("Navigation & scroll", () => {
  17 |   test("Clicking the navbar 'Contact' link opens the page at the top", async ({ page }) => {
> 18 |     await page.goto("/");
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  19 |     await page.waitForLoadState("domcontentloaded");
  20 | 
  21 |     // Scroll to the bottom of home.
  22 |     await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  23 |     const before = await page.evaluate(() => window.scrollY);
  24 |     test.skip(before < 100, "Home page is shorter than expected at this viewport");
  25 | 
  26 |     // Real SPA navigation via a Link. The navbar may have multiple "Contact"
  27 |     // links (header + footer + mobile drawer), so use first().
  28 |     await page.getByRole("link", { name: /^contact$/i }).first().click();
  29 | 
  30 |     // Wait until we're actually on /contact.
  31 |     await page.waitForURL(/\/contact/, { timeout: 10_000 });
  32 |     await page.waitForLoadState("domcontentloaded");
  33 | 
  34 |     // ScrollToTop should have reset us.
  35 |     await page.waitForTimeout(300);
  36 |     const after = await page.evaluate(() => window.scrollY);
  37 |     expect(after).toBeLessThan(80);
  38 |   });
  39 | 
  40 |   test("Clicking a /#use-cases link from another route scrolls to that section", async ({ page }) => {
  41 |     await page.goto("/contact");
  42 |     await page.waitForLoadState("domcontentloaded");
  43 | 
  44 |     // The Use Cases anchor lives in the navbar and/or footer as
  45 |     // <a href="/#use-cases"> or <Link to="/#use-cases">.
  46 |     await page.getByRole("link", { name: /use cases/i }).first().click();
  47 |     await page.waitForURL(/\/#use-cases/, { timeout: 10_000 });
  48 | 
  49 |     const target = page.locator("#use-cases");
  50 |     await expect(target).toBeVisible({ timeout: 8000 });
  51 | 
  52 |     // Give ScrollToTop's retry window time to fire.
  53 |     await page.waitForTimeout(900);
  54 | 
  55 |     const box = await target.boundingBox();
  56 |     expect(box).not.toBeNull();
  57 |     if (box) {
  58 |       // Section should be near the top of the viewport, not below the fold.
  59 |       expect(box.y).toBeLessThan(220);
  60 |     }
  61 |   });
  62 | 
  63 |   test("Clicking a /#tools / 'See all tools' link from another route scrolls to that section", async ({ page }) => {
  64 |     await page.goto("/contact");
  65 |     await page.waitForLoadState("domcontentloaded");
  66 | 
  67 |     await page
  68 |       .getByRole("link", { name: /tools|see all|features/i })
  69 |       .first()
  70 |       .click();
  71 |     await page.waitForURL(/\/#tools|\/$/, { timeout: 10_000 });
  72 | 
  73 |     const target = page.locator("#tools");
  74 |     await expect(target).toBeVisible({ timeout: 8000 });
  75 |     await page.waitForTimeout(900);
  76 | 
  77 |     const box = await target.boundingBox();
  78 |     expect(box).not.toBeNull();
  79 |     if (box) {
  80 |       expect(box.y).toBeLessThan(220);
  81 |     }
  82 |   });
  83 | });
  84 | 
```