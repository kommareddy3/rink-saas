# RINK end-to-end tests

Playwright tests that exercise the **email-template flows** and the
navigation fixes against a real, running site.

## Flows covered

| Spec file                     | Flow / template triggered                     |
|-------------------------------|-----------------------------------------------|
| `contact-form.spec.ts`        | Contact form submit → `contact-team.html` + `contact-user.html` |
| `auth-signup.spec.ts`         | New-account sign-up → `confirm-signup.html`   |
| `auth-forgot.spec.ts`         | Forgot-password flow → `reset-password.html`  |
| `nav-scroll.spec.ts`          | ScrollToTop + in-page anchor (`/#use-cases`, `/#tools`)  |
| `welcome-email.spec.ts`       | First sign-in → `welcome.html` (gated on `RINK_E2E_USER_*`) |

By default, every spec hits **https://rinkglobal.com** (the production
site). You can override with the `BASE_URL` env var to test against a
preview deployment or `http://localhost:5173` for local dev.

## Setup

```bash
cd client
npm install -D @playwright/test
npx playwright install --with-deps   # one-time browser download
```

## Run

```bash
# everything (default: production)
npm run e2e

# against a preview URL
BASE_URL=https://rink-preview.vercel.app npm run e2e

# locally — start `npm run dev` in another shell first
BASE_URL=http://localhost:5173 npm run e2e

# headed (watch the browser)
npm run e2e:headed

# one spec
npm run e2e -- contact-form
```

## Configuration & secrets

These env vars control optional, real-credential-requiring assertions
(they default to *skipped* so the suite stays green for first-time runs):

| Env var                 | What it enables                                                      |
|-------------------------|----------------------------------------------------------------------|
| `BASE_URL`              | Override the target site (default `https://rinkglobal.com`)          |
| `RINK_E2E_USER_EMAIL`   | A pre-created RINK account email — enables welcome-email + sign-in tests |
| `RINK_E2E_USER_PASSWORD`| Password for the above account                                       |
| `MAILOSAUR_SERVER_ID`   | Mailosaur server ID — enables inbox assertions (see below)           |
| `MAILOSAUR_API_KEY`     | Mailosaur API key                                                    |

### Verifying that the real email arrived

Three options, in order of fidelity:

1. **Resend dashboard** (manual). Every test that triggers an email also
   logs a unique correlation string ("RINK e2e #<timestamp>") into the
   subject/body. Open https://resend.com/emails after the run, filter by
   that string, and confirm `Delivered`. Good enough for ad-hoc runs.

2. **Mailosaur** (automated). Sign up at mailosaur.com, point the
   contact-form email to your Mailosaur address (e.g.
   `e2e@<server>.mailosaur.net`), set the two env vars above, and the
   tests will programmatically read the inbox and assert the email
   body/subject. Free tier is plenty for CI.

3. **Mailtrap / Resend test address**. For pure smoke-testing, send to
   `delivered@resend.dev` — Resend accepts but doesn't deliver. Confirms
   the send was accepted by the API; tells you nothing about deliverability.

## CI

Wired into `.github/workflows/ci.yml` as an optional job that runs only
when `RUN_E2E` repository variable is `"true"` (or on a manual
`workflow_dispatch`). Production runs from a release tag are recommended;
running on every PR is overkill.
