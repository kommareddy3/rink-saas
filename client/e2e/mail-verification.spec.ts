import { test, expect } from "@playwright/test";
import { HAS_MAILOSAUR, correlation, randomEmail } from "./helpers";

/**
 * Inbox-side assertions — only runs when Mailosaur creds are present.
 *
 *   1. Submit the contact form with a Mailosaur address as the From.
 *   2. Submit a sign-up with a Mailosaur address.
 *   3. Read the Mailosaur inbox and assert each expected email arrived.
 *
 * Sign up at mailosaur.com (free tier). Set:
 *   MAILOSAUR_SERVER_ID = <8-char id>
 *   MAILOSAUR_API_KEY   = <api key>
 */
test.describe("Inbox verification (Mailosaur)", () => {
  test.skip(!HAS_MAILOSAUR, "Set MAILOSAUR_SERVER_ID + MAILOSAUR_API_KEY to enable");

  test("contact form auto-acknowledgement is delivered", async ({ page, request }) => {
    const tag = correlation("inbox-contact");
    const email = randomEmail("e2e-inbox");

    await page.goto("/contact");
    await page.getByLabel(/your name/i).fill("E2E Inbox");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/subject/i).fill(`${tag} (inbox)`);
    await page.getByLabel(/message/i).fill(`Automated e2e probe (${tag}). Ignore.`);
    await page.getByRole("button", { name: /send|submit/i }).click();

    await expect(page.getByText(/thanks|got it|in touch/i)).toBeVisible({ timeout: 15_000 });

    // Poll Mailosaur for the acknowledgement.
    const serverId = process.env.MAILOSAUR_SERVER_ID!;
    const apiKey = process.env.MAILOSAUR_API_KEY!;
    const searchBody = {
      sentTo: email,
      subject: "We got your message",
    };
    let body: any = null;
    for (let i = 0; i < 30 && !body; i++) {
      const resp = await request.post(
        `https://mailosaur.com/api/messages/search?server=${serverId}&timeout=10000`,
        { headers: { Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}` },
          data: searchBody }
      );
      if (resp.ok()) {
        const j = await resp.json();
        if (j?.items?.length) { body = j.items[0]; break; }
      }
      await page.waitForTimeout(2000);
    }
    expect(body, `no acknowledgement email arrived for ${email}`).not.toBeNull();
    expect(body.subject).toMatch(/got your message|we got it/i);
  });
});
