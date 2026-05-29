import { test, expect } from "@playwright/test";
import { HAS_MAILOSAUR, correlation, randomEmail } from "./helpers";

/**
 * Sign-up flow → Supabase fires the `confirm-signup.html` template.
 *
 * Supabase rejects throwaway domains (e.g. `@example.com`) at the form
 * level, so to actually exercise the flow we need a deliverable address.
 * The spec is gated on Mailosaur — set MAILOSAUR_SERVER_ID + MAILOSAUR_API_KEY
 * to enable. Without them the test skips so the suite stays green.
 */
test.describe("Sign-up flow", () => {
  test.skip(!HAS_MAILOSAUR, "Set MAILOSAUR_SERVER_ID + MAILOSAUR_API_KEY to exercise this flow");

  test("new account → 'check your inbox' confirmation view", async ({ page }) => {
    const tag = correlation("signup");
    const email = randomEmail("e2e-signup");

    await page.goto("/auth?mode=register");

    await expect(
      page.getByRole("heading", { name: /create your account|sign up/i })
    ).toBeVisible();

    await page.getByLabel(/first name/i).fill("E2E");
    await page.getByLabel(/last name/i).fill("Bot");
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/^password$/i).fill("CorrectHorseBatteryStaple!42");
    const confirm = page.getByLabel(/confirm password/i);
    if (await confirm.count()) {
      await confirm.fill("CorrectHorseBatteryStaple!42");
    }

    await page.getByRole("button", { name: /create account|sign up/i }).click();

    // Supabase has accepted the sign-up; the app lands on the CheckEmail view.
    await expect(
      page.getByText(/check your inbox|we sent a confirmation/i)
    ).toBeVisible({ timeout: 25_000 });

    test.info().annotations.push({
      type: "correlation",
      description: `${tag} (${email})`,
    });
  });
});
