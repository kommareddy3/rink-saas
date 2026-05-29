import { test, expect } from "@playwright/test";
import { correlation, randomEmail } from "./helpers";

/**
 * Sign-up flow → Supabase fires the `confirm-signup.html` template.
 * We submit a registration with a fresh email and assert the app reaches
 * the "check your inbox" view. The verification email itself is asserted
 * by a separate Mailosaur-gated test (`mail-verification.spec.ts`).
 */
test.describe("Sign-up flow", () => {
  test("new account → 'check your inbox' confirmation view", async ({ page }) => {
    const tag = correlation("signup");
    const email = randomEmail("e2e-signup");

    await page.goto("/auth?mode=register");

    // The page header copy is "Create your account".
    await expect(page.getByRole("heading", { name: /create your account|sign up/i })).toBeVisible();

    await page.getByLabel(/first name/i).fill("E2E");
    await page.getByLabel(/last name/i).fill("Bot");
    await page.getByLabel(/email/i).fill(email);

    // Use the password field by name to avoid hitting "Confirm password" first.
    await page.getByLabel(/^password$/i).fill("CorrectHorseBatteryStaple!42");
    const confirm = page.getByLabel(/confirm password/i);
    if (await confirm.count()) {
      await confirm.fill("CorrectHorseBatteryStaple!42");
    }

    await page.getByRole("button", { name: /create account|sign up/i }).click();

    // Supabase has accepted the sign-up; the app lands on the CheckEmail view.
    await expect(
      page.getByText(/check your (inbox|email)|we sent a (confirmation|verification)/i)
    ).toBeVisible({ timeout: 20_000 });

    test.info().annotations.push({ type: "correlation", description: `${tag} (${email})` });
  });
});
