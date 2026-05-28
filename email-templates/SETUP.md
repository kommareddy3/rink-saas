# Email setup guide

This guide walks through configuring **every email flow** in the RINK
platform, top to bottom. Two systems send mail:

1. **Our Express server** sends transactional mail through **Resend** —
   the welcome email and the two contact-form emails.
2. **Supabase Auth** sends every account/security email (sign-up
   confirmation, password reset, magic link, email change, reauth, invite).
   We can either let Supabase send through *its own* SMTP **or** route
   those emails through Resend too so everything is unified under one
   sender/brand. The unified Resend route is recommended for production.

---

## 1. Every email flow at a glance

| # | Flow                              | Sent by  | Template (this folder)                | Trigger                                          |
|---|-----------------------------------|----------|---------------------------------------|--------------------------------------------------|
| 1 | Welcome                           | Server   | `welcome.html`                        | First successful sign-in (client → `/api/welcome-email`) |
| 2 | Contact form — team notification  | Server   | `contact-team.html`                   | Public contact form submission (`/api/contact`)  |
| 3 | Contact form — user acknowledgement | Server | `contact-user.html`                   | Public contact form submission (`/api/contact`)  |
| 4 | Confirm sign-up                   | Supabase | `confirm-signup.html`                 | Email/password sign-up                           |
| 5 | Password reset                    | Supabase | `reset-password.html`                 | "Forgot password" → `/auth?mode=forgot`          |
| 6 | Magic-link sign-in                | Supabase | `magic-link.html`                     | Passwordless sign-in / OTP                       |
| 7 | Change email address              | Supabase | `change-email.html`                   | Profile page → change email                      |
| 8 | Reauthentication                  | Supabase | `reauthentication.html`               | Sensitive action requiring re-verify             |
| 9 | Invite teammate (optional)        | Supabase | `invite.html`                         | `auth.admin.inviteUserByEmail` (future)          |

---

## 2. Mailboxes the project uses

All four mailboxes live on `rinkglobal.com`:

| Mailbox                         | Purpose                                                  |
|---------------------------------|----------------------------------------------------------|
| `hello@rinkglobal.com`          | Outbound `From:` for app mail · general/contact inbox    |
| `support@rinkglobal.com`        | Customer support (linked from Contact page)              |
| `billing@rinkglobal.com`        | Billing inquiries (linked from Contact page)             |
| `admin@rinkglobal.com`          | Security disclosures · DPA / legal · `Reply-To` for auth |

---

## 3. Resend setup (one time)

### 3.1  Create the account + verify the domain

1. Sign up at **https://resend.com** (the free tier is 3 000 emails/month,
   100/day — fine for early production).
2. **Domains → Add Domain → `rinkglobal.com`** (apex). If you prefer a
   sending subdomain (recommended only if you're paranoid about keeping
   transactional traffic off your main domain), use `mail.rinkglobal.com`
   and update `WELCOME_FROM_EMAIL` accordingly.
3. Add the three DNS records Resend shows you to your DNS provider:
   - **SPF** — `TXT @ "v=spf1 include:amazonses.com ~all"` (or merge into
     your existing SPF record; you can only have one).
   - **DKIM** — `TXT resend._domainkey  <long key>`.
   - **Return-Path / MX** — for bounce handling.
4. Add a **DMARC** record yourself (Resend doesn't auto-create it):
   `TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:admin@rinkglobal.com"`.
   Start at `p=none` if you want a soft launch, then move to `quarantine`
   once you confirm legitimate mail passes.
5. Wait for Resend to mark all rows green (usually 5–30 min).
6. **API Keys → Create API Key** → copy the key (starts `re_…`).

### 3.2  Set the server env vars

In your **Vercel project for `rink-api`** (the Express gateway):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
WELCOME_FROM_EMAIL=RINK <hello@rinkglobal.com>
CONTACT_FROM_EMAIL=RINK <hello@rinkglobal.com>
TEAM_EMAIL=hello@rinkglobal.com         # where contact-form submissions land
APP_URL=https://rinkglobal.com
DOCS_URL=https://docs.rinkglobal.com
```

These map to the env keys already referenced in `server/server.js`.

### 3.3  Smoke-test the server emails

After deploy, hit the endpoints from a terminal (replace the bearer token
with one from your signed-in browser session):

```bash
# Welcome
curl -X POST https://api.rinkglobal.com/api/welcome-email \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"

# Contact (public — no auth)
curl -X POST https://api.rinkglobal.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke","email":"you@example.com","subject":"Test","message":"Just checking."}'
```

You should receive:
- the welcome email at the signed-in user's address,
- the contact notification at `hello@rinkglobal.com`,
- the contact acknowledgement at the email you put in the form.

---

## 4. Supabase Auth setup

You have two options for the six Supabase-sent flows.

### Option A (recommended) — Route Supabase through Resend's SMTP

This unifies the sender, keeps everything inside one mail vendor, and
gives you the same deliverability reputation across the whole app.

1. In Resend: **Settings → SMTP → Show credentials**. Copy host
   (`smtp.resend.com`), port (`465` SSL or `587` STARTTLS), username
   (`resend`), and the SMTP password.
2. In Supabase: **Authentication → Settings → SMTP Settings → Enable
   custom SMTP**. Paste:
   - Sender email: `hello@rinkglobal.com`
   - Sender name: `RINK Global Services`
   - Host: `smtp.resend.com`
   - Port: `465`
   - User: `resend`
   - Password: the SMTP password from Resend
3. Save. Supabase will use this for every auth email.

### Option B — Use Supabase's built-in mail relay

Default. Works fine for low volume, but the sender domain is
`noreply@mail.app.supabase.io` which lands in spam more often and doesn't
reflect your brand. Don't use it in production unless you must.

### 4.1  Paste each template into Supabase

In Supabase: **Authentication → Email Templates**. For each template
below, copy the full HTML from this folder into the **Message (HTML)**
box and set the **Subject** as listed:

| Supabase template       | Subject                                          | File                       |
|-------------------------|--------------------------------------------------|----------------------------|
| Confirm signup          | `Confirm your RINK account`                      | `confirm-signup.html`      |
| Invite user             | `You've been invited to RINK`                    | `invite.html`              |
| Magic link              | `Your RINK sign-in link`                         | `magic-link.html`          |
| Change email address    | `Confirm your new RINK email`                    | `change-email.html`        |
| Reset password          | `Reset your RINK password`                       | `reset-password.html`      |
| Reauthentication        | `Confirm it's you — RINK reauthentication`       | `reauthentication.html`    |

Supabase template variables already wired into each file:
`{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`,
`{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Data.first_name }}`, `{{ .SiteURL }}`.

### 4.2  Configure redirect URLs

Supabase: **Authentication → URL Configuration**:

- **Site URL**: `https://rinkglobal.com`
- **Redirect URLs** (allow-list): add the production app URL and any
  preview/staging URLs you use:
  - `https://rinkglobal.com/**`
  - `http://localhost:5173/**` (dev)

The reset link in `reset-password.html` lands on
`https://rinkglobal.com/auth?mode=reset`, so make sure that route is
allow-listed.

### 4.3  Test from the running app

Trigger each flow once and confirm the email arrives:

- Sign up with a fresh email → **confirm-signup**.
- Click *Forgot password* → **reset-password**.
- (If enabled) request a magic link → **magic-link**.
- On the Profile page, change your email → **change-email** (lands in the
  new inbox).
- Trigger a sensitive action → **reauthentication**.

---

## 5. Deliverability hygiene checklist

Even with perfect templates, mail can land in spam without these. Tick
each:

- ✅ SPF, DKIM, and DMARC published for `rinkglobal.com`.
- ✅ DMARC at least `p=none` for the first week; promote to `quarantine`.
- ✅ Resend dashboard shows **all three rows green** before you go live.
- ✅ `From:` is on the verified domain (`hello@rinkglobal.com`).
- ✅ `Reply-To:` is a real, monitored mailbox (`hello@`).
- ✅ No image-only emails — every template here has substantial text.
- ✅ HTTPS links only (no `http://`).
- ✅ Plain-text fallback. Resend auto-generates one from the HTML; you
  don't need to supply it.

---

## 6. What changes when you customise

If you tweak a template, keep the **template variables** intact —
they're how Supabase / our server fills the fields:

| Engine    | Syntax                                      | Used in                                |
|-----------|---------------------------------------------|----------------------------------------|
| Server    | `{{first_name}}` (single-brace + ident)     | `welcome.html`, `contact-*.html`       |
| Supabase  | `{{ .ConfirmationURL }}`, `{{ .Email }}`    | every `confirm-*`, `reset-*`, etc.     |

If you rename a variable or remove one, update **both** the template
**and** the server-side string-replace in `server/server.js`.
