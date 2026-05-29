import { test, expect } from "@playwright/test";
import { correlation, randomEmail } from "./helpers";

/**
 * Contact form → triggers `contact-team.html` (and, when wired,
 * `contact-user.html`) via POST /api/contact.
 *
 * The real form has:
 *   - a reason **button group** (pick one of: General, Support, Feedback, …)
 *   - "Full name" + "Work email" text inputs
 *   - a "Message" textarea
 *   - a REQUIRED "I agree…" consent checkbox
 *   - a "Send message" submit button
 */
test.describe("Contact form", () => {
  test("submits successfully and shows the confirmation state", async ({ page }) => {
    const tag = correlation();
    const email = randomEmail("e2e-contact");

    await page.goto("/contact");
    await expect(page).toHaveTitle(/RINK/i);

    // Reason buttons render as clickable cards. Pick "General inquiry".
    await page.getByRole("button", { name: /general inquiry/i }).first().click();

    await page.getByLabel(/full name/i).fill("E2E Smoke");
    await page.getByLabel(/work email/i).fill(email);
    await page.getByLabel(/^message$/i).fill(
      `Automated e2e probe (${tag}). Please ignore.`
    );

    // Required consent checkbox — labelled by the "I agree…" copy.
    await page.getByRole("checkbox").check();

    await page.getByRole("button", { name: /send message/i }).click();

    // The Contact page shows "Message sent — thanks!" on success.
    await expect(
      page.getByText(/message sent|thanks|in touch/i)
    ).toBeVisible({ timeout: 15_000 });

    test.info().annotations.push({ type: "correlation", description: tag });
  });

  test("rejects an obviously invalid email client-side", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: /general inquiry/i }).first().click();
    await page.getByLabel(/full name/i).fill("E2E");
    await page.getByLabel(/work email/i).fill("not-an-email");
    await page.getByLabel(/^message$/i).fill("Body.");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /send message/i }).click();

    // Inline validation should appear; we accept any "valid email"-ish text.
    await expect(
      page.getByText(/valid email|enter.*email|valid.*email format/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
