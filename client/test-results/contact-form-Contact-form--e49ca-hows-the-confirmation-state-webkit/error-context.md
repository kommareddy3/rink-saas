# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: contact-form.spec.ts >> Contact form >> submits successfully and shows the confirmation state
- Location: e2e/contact-form.spec.ts:16:3

# Error details

```
Error: page.goto: Could not connect to the server.
Call log:
  - navigating to "http://localhost:5173/contact", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { correlation, randomEmail } from "./helpers";
  3  | 
  4  | /**
  5  |  * Contact form → triggers `contact-team.html` (and, when wired,
  6  |  * `contact-user.html`) via POST /api/contact.
  7  |  *
  8  |  * The real form has:
  9  |  *   - a reason **button group** (pick one of: General, Support, Feedback, …)
  10 |  *   - "Full name" + "Work email" text inputs
  11 |  *   - a "Message" textarea
  12 |  *   - a REQUIRED "I agree…" consent checkbox
  13 |  *   - a "Send message" submit button
  14 |  */
  15 | test.describe("Contact form", () => {
  16 |   test("submits successfully and shows the confirmation state", async ({ page }) => {
  17 |     const tag = correlation();
  18 |     const email = randomEmail("e2e-contact");
  19 | 
> 20 |     await page.goto("/contact");
     |                ^ Error: page.goto: Could not connect to the server.
  21 |     await expect(page).toHaveTitle(/RINK/i);
  22 | 
  23 |     // Reason buttons render as clickable cards. Pick "General inquiry".
  24 |     await page.getByRole("button", { name: /general inquiry/i }).first().click();
  25 | 
  26 |     await page.getByLabel(/full name/i).fill("E2E Smoke");
  27 |     await page.getByLabel(/work email/i).fill(email);
  28 |     await page.getByLabel(/^message$/i).fill(
  29 |       `Automated e2e probe (${tag}). Please ignore.`
  30 |     );
  31 | 
  32 |     // Required consent checkbox — labelled by the "I agree…" copy.
  33 |     await page.getByRole("checkbox").check();
  34 | 
  35 |     await page.getByRole("button", { name: /send message/i }).click();
  36 | 
  37 |     // The Contact page shows "Message sent — thanks!" on success.
  38 |     await expect(
  39 |       page.getByText(/message sent|thanks|in touch/i)
  40 |     ).toBeVisible({ timeout: 15_000 });
  41 | 
  42 |     test.info().annotations.push({ type: "correlation", description: tag });
  43 |   });
  44 | 
  45 |   test("rejects an obviously invalid email client-side", async ({ page }) => {
  46 |     await page.goto("/contact");
  47 |     await page.getByRole("button", { name: /general inquiry/i }).first().click();
  48 |     await page.getByLabel(/full name/i).fill("E2E");
  49 |     await page.getByLabel(/work email/i).fill("not-an-email");
  50 |     await page.getByLabel(/^message$/i).fill("Body.");
  51 |     await page.getByRole("checkbox").check();
  52 |     await page.getByRole("button", { name: /send message/i }).click();
  53 | 
  54 |     // Inline validation should appear; we accept any "valid email"-ish text.
  55 |     await expect(
  56 |       page.getByText(/valid email|enter.*email|valid.*email format/i)
  57 |     ).toBeVisible({ timeout: 5000 });
  58 |   });
  59 | });
  60 | 
```