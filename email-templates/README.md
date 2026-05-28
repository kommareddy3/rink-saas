# RINK Email Templates

Custom HTML templates for every email flow the project sends, plus the
configuration steps for Resend and Supabase.

> **Full setup walkthrough → [`SETUP.md`](./SETUP.md).** This README is
> just the index.

```
email-templates/
├── SETUP.md                  ← step-by-step configuration guide
│
├── welcome.html              Sent by our server via Resend on first sign-in
├── contact-team.html         Sent by our server to the team on a new contact-form message
├── contact-user.html         Sent by our server to the submitter as an auto-acknowledgement
│
├── confirm-signup.html   ─┐
├── reset-password.html    │
├── magic-link.html        │  Pasted into the Supabase dashboard
├── change-email.html      │  (Authentication → Email Templates)
├── reauthentication.html  │
└── invite.html           ─┘
```

All templates share one visual language: white body, dark navy gradient
header, 600 px max width, table-based layout, inline CSS, gradient
blue→purple CTAs — designed to render consistently across Gmail, Outlook,
Apple Mail, and mobile clients.

---

## Flow → template map

| Flow                                  | Sent by  | Template                | Subject suggestion                                |
|---------------------------------------|----------|-------------------------|---------------------------------------------------|
| First-sign-in welcome                 | Server   | `welcome.html`          | `Welcome to RINK Global Services`                 |
| Contact form — team notification      | Server   | `contact-team.html`     | `New contact form: {{subject}}`                   |
| Contact form — user acknowledgement   | Server   | `contact-user.html`     | `We got your message · RINK Global Services`      |
| Confirm sign-up                       | Supabase | `confirm-signup.html`   | `Confirm your RINK account`                       |
| Password reset                        | Supabase | `reset-password.html`   | `Reset your RINK password`                        |
| Magic-link sign-in                    | Supabase | `magic-link.html`       | `Your RINK sign-in link`                          |
| Change email address                  | Supabase | `change-email.html`     | `Confirm your new RINK email`                     |
| Reauthentication                      | Supabase | `reauthentication.html` | `Confirm it's you — RINK reauthentication`        |
| Invite teammate (future)              | Supabase | `invite.html`           | `You've been invited to RINK`                     |

---

## Template variables

| Engine        | Used in                          | Syntax                                                               |
|---------------|----------------------------------|----------------------------------------------------------------------|
| Server-side   | `welcome.html`, `contact-*.html` | `{{first_name}}`, `{{name}}`, `{{email}}`, `{{subject}}`, `{{message}}`, `{{site_url}}`, `{{docs_url}}` |
| Supabase (Go) | every other file                 | `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Data.first_name }}` |

`first_name` / `last_name` user-metadata fields are populated by the
`signUp` call in `client/src/contexts/AuthContext.jsx`.

---

## Mailboxes referenced in the templates

| Mailbox                    | Role                                                            |
|----------------------------|-----------------------------------------------------------------|
| `hello@rinkglobal.com`     | `From:` on every outbound email; general inbox; Reply-To target |
| `support@rinkglobal.com`   | Customer-support contact (surfaced in the user ack)             |
| `billing@rinkglobal.com`   | Billing inquiries (surfaced in the user ack)                    |
| `admin@rinkglobal.com`     | Security disclosures, DPA, account-recovery escalations         |

---

## Quick local test

Send to Resend's test inbox (no real delivery required):

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "RINK <hello@rinkglobal.com>",
    "to": ["delivered@resend.dev"],
    "subject": "Welcome smoke test",
    "html": "<p>Hello from RINK.</p>"
  }'
```

See [`SETUP.md`](./SETUP.md) for end-to-end smoke tests against the
running server and the Supabase auth flows.
