import { test, expect } from "@playwright/test";
import { randomEmail } from "./helpers";

/**
 * Forgot-password flow → Supabase fires `reset-password.html`.
 * We don't have a valid account guarantee here, but the app shows the
 * success view regardless (to prevent enumeration), which is exactly
 * what we assert.
 */
test.describe("Forgot password", () => {
  test("entering an email shows the 'reset link sent' confirmation", async ({ page }) => {
    const email = randomEmail("e2e-forgot");

    await page.goto("/auth?mode=forgot");
    await expect(page.getByRole("heading", { name: /forgot|reset/i })).toBeVisible();

    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("button", { name: /send.*link|reset password|continue/i }).click();

    await expect(
      page.getByText(/reset link sent|check your (inbox|email)|sent/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
