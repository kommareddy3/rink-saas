import { test, expect } from "@playwright/test";
import { correlation, randomEmail } from "./helpers";

/**
 * Contact form → triggers `contact-team.html` and `contact-user.html`
 * via POST /api/contact.
 */
test.describe("Contact form", () => {
  test("submits successfully and shows the confirmation state", async ({ page }) => {
    const tag = correlation();
    const email = randomEmail("e2e-contact");

    await page.goto("/contact");
    await expect(page).toHaveTitle(/RINK/i);

    await page.getByLabel(/your name/i).fill("E2E Smoke");
    await page.getByLabel(/email/i).fill(email);
    // Subject and message — the page renders these as labelled inputs.
    await page.getByLabel(/subject/i).fill(`${tag} contact submit`);
    await page.getByLabel(/message/i).fill(
      `This is an automated e2e probe (${tag}).\nIgnore.`
    );

    // The submit button is the most prominent primary button on the page.
    const submit = page.getByRole("button", { name: /send|submit/i });
    await submit.click();

    // Success copy. The Contact page swaps the form for a "Thanks…" view
    // on a successful POST; we accept either pattern.
    await expect(
      page.getByText(/thanks|message received|got it|in touch/i)
    ).toBeVisible({ timeout: 15_000 });

    // Surface the correlation tag in the test output for manual Resend lookup.
    test.info().annotations.push({ type: "correlation", description: tag });
  });

  test("rejects an obviously invalid email client-side", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel(/your name/i).fill("E2E");
    await page.getByLabel(/email/i).fill("not-an-email");
    await page.getByLabel(/subject/i).fill("invalid email test");
    await page.getByLabel(/message/i).fill("Body.");
    await page.getByRole("button", { name: /send|submit/i }).click();

    // Either inline validation kicks in OR the form stays unchanged.
    await expect(page.getByText(/valid email|enter.*email/i)).toBeVisible({ timeout: 5000 });
  });
});
