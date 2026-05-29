/**
 * Shared helpers for the e2e suite.
 *
 *  - `correlation()` returns a unique tag (e.g. "RINK e2e #1716830000-3217")
 *    that is embedded in subjects / message bodies so an operator can later
 *    confirm the email in Resend's dashboard.
 *
 *  - `randomEmail()` returns a one-shot address. If MAILOSAUR_SERVER_ID is
 *    set, it builds a real-deliverable Mailosaur address; otherwise it
 *    returns an `@example.com` address (works for the contact form but the
 *    email won't actually deliver — that's fine for smoke testing).
 */
export function correlation(prefix = "RINK e2e"): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 10_000);
  return `${prefix} #${ts}-${rand}`;
}

export function randomEmail(local = "user"): string {
  const serverId = process.env.MAILOSAUR_SERVER_ID;
  const ts = Date.now();
  if (serverId) {
    return `${local}.${ts}@${serverId}.mailosaur.net`;
  }
  return `${local}.${ts}@example.com`;
}

export const HAS_TEST_ACCOUNT =
  !!process.env.RINK_E2E_USER_EMAIL && !!process.env.RINK_E2E_USER_PASSWORD;

export const HAS_MAILOSAUR =
  !!process.env.MAILOSAUR_SERVER_ID && !!process.env.MAILOSAUR_API_KEY;
