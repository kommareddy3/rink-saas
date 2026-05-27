# RINK Email Templates

Custom email templates for every Supabase-driven user flow, plus a
separately-sent welcome email triggered by our backend.

```
email-templates/
├── confirm-signup.html   ─┐
├── reset-password.html    │  Paste into Supabase dashboard
├── magic-link.html        │  (Authentication → Email Templates)
├── change-email.html      │
├── invite.html           ─┘
└── welcome.html             Sent by Express via Resend after first sign-in
```

All templates use a consistent visual language:

- White email body with dark navy header bar (matches the RINK brand
  without triggering email-client dark-mode inversions).
- 600 px max width, table-based layout for max client compatibility.
- Inline CSS only — no `<style>` blocks that get stripped.
- Gradient blue→purple CTA button.
- Personalization via Supabase template variables (or template-string
  interpolation in the case of `welcome.html`).

---

## Installing the Supabase templates

1. Go to your Supabase project → **Authentication → Email Templates**.
2. For each of the four templates below, copy the file contents and paste
   into the corresponding template editor.
3. Set the **subject line** as suggested.
4. Click **Save**.

| Template file              | Supabase tab              | Recommended subject                              |
| -------------------------- | ------------------------- | ------------------------------------------------ |
| `confirm-signup.html`      | Confirm signup            | `Confirm your RINK account`                      |
| `reset-password.html`      | Reset password            | `Reset your RINK password`                       |
| `magic-link.html`          | Magic link                | `Your RINK sign-in link`                         |
| `change-email.html`        | Change email address      | `Confirm your new RINK email`                    |

> **Heads up.** Supabase's default sending domain (`mail.app.supabase.io`)
> is fine for development but lands in spam for many recipients in
> production. For production, configure SMTP in **Project Settings → Auth
> → SMTP Settings** — Resend, Postmark, or Amazon SES all work well.

## Template variables

These are the Supabase template variables used:

| Variable                | Where it comes from                                     |
| ----------------------- | ------------------------------------------------------- |
| `{{ .ConfirmationURL }}`| Supabase-built link the user clicks to complete the action |
| `{{ .Email }}`          | The user's email address                                |
| `{{ .SiteURL }}`        | The Site URL set in **Auth → URL Configuration**        |
| `{{ .Data.first_name }}`| User metadata field set during signup                    |
| `{{ .Data.last_name }}` | User metadata field set during signup                    |

`first_name` and `last_name` are populated by the `signUp` call in
`client/src/contexts/AuthContext.jsx`.

---

## Welcome email (Resend)

The welcome email is **not** a Supabase template — it's sent from our
Express gateway after the user's first successful sign-in. This lets us:

- Customize content based on user metadata.
- Avoid Supabase's "one email per flow" limitation.
- Track delivery and bounces via the Resend dashboard.

### Setup

1. Create a free account at [resend.com](https://resend.com).
2. Verify your sending domain in Resend — either the apex
   (`rinkglobal.com`) or a sending subdomain (`mail.rinkglobal.com`).
   Add the DKIM / SPF / Return-Path records they generate. Free tier
   includes 3,000 emails/month, 100/day.
3. Generate an API key in **API Keys**.
4. Set these env vars on the Vercel `rink-api` project:
   - `RESEND_API_KEY` — the key from step 3.
   - `WELCOME_FROM_EMAIL` — e.g. `RINK <hello@rinkglobal.com>`.

### Flow

```
Client signs in for the first time ─→ AuthContext checks
  user_metadata.welcome_sent. If false:
     POST /api/welcome-email  ─→  Express → Resend → user's inbox
     supabase.auth.updateUser({ data: { welcome_sent: true } })
```

The flag is stored in Supabase user metadata so it survives sessions and
isn't tied to a single browser.

### Customizing the welcome content

The HTML in `welcome.html` is the source of truth. The Express endpoint
includes an inline copy (so Vercel doesn't need filesystem access at
runtime). When you edit `welcome.html`, copy the updated HTML into the
`WELCOME_EMAIL_HTML` constant in `server/server.js`.

If you'd prefer the server to read the file at startup, add the
`includeFiles` config to `vercel.json` so the email-templates folder is
bundled.

---

## Testing emails locally

For end-to-end testing without polluting real inboxes:

- [Mailpit](https://github.com/axllent/mailpit) — local SMTP catcher.
- [Maildev](https://github.com/maildev/maildev) — alternative catcher.

For Resend specifically, send to `delivered@resend.dev` to verify the
flow without an inbox round-trip.
