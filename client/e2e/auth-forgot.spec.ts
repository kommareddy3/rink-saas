import { test, expect } from "@playwright/test";
import { randomEmail } from "./helpers";

/**
 * Forgot-password flow → Supabase fires `reset-password.html`.
 *
 * The success view appears regardless of whether the email matches an
 * existing account (anti-enumeration), so we can assert it deterministically
 * with any email format.
 */
test.describe("Forgot password", () => {
  test("entering an email shows the 'reset link sent' confirmation", async ({ page }) => {
    const email = randomEmail("e2e-forgot");

    await page.goto("/auth?mode=forgot");

    // Heading on the FORGOT view is "Forgot your password?"
    await expect(
      page.getByRole("heading", { name: /forgot|reset/i })
    ).toBeVisible();

    await page.getByLabel(/account email|^email$/i).fill(email);
    await page.getByRole("button", { name: /send reset link|send.*link|reset password/i }).click();

    // Success heading "Reset link sent" or supporting copy.
    await expect(
      page.getByText(/reset link sent|check.*for the reset link|sent/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
