# Accounts & sign-in

RINK uses [Supabase](https://supabase.com) for authentication. The flows
below cover everything you might need.

## Sign up

1. Go to [rinkglobal.com/auth?mode=register](https://rinkglobal.com/auth?mode=register).
2. Enter your name, email, optional phone, and a password (8+ characters).
3. Click **Create account**.

If your Supabase project requires email confirmation (the default), you'll
land on a *Check your inbox* screen. The email contains a link that:

- Confirms your email.
- Logs you in.
- Redirects you to the workspace.

If you don't get the email within a minute or two, click **Resend
confirmation email** on the same screen.

### Password requirements

- Minimum 8 characters.
- The live strength meter rates your password from *Very weak* to *Very strong*.
- Stronger passwords combine length, mixed case, digits, and symbols.

## Sign in

You have three ways to sign in:

1. **Email + password** — go to [rinkglobal.com/auth](https://rinkglobal.com/auth),
   enter your credentials, click **Sign in**.
2. **Social provider** — click **Google**, **GitHub**, **Microsoft**, or
   **LinkedIn** on the same page. We redirect to the provider, you approve,
   you land back in RINK signed in. First-time use creates a fresh RINK
   account linked to your provider identity.
3. **Passkey** — click **Sign in with passkey**. Your browser shows a list
   of passkeys you've registered (Face ID / Touch ID / Windows Hello / a
   hardware key) and signs you in instantly. See
   [Passkeys](#passkeys) for setup.

If you've never confirmed your email (and you signed up with email +
password), sign-in will fail and you'll be sent back to the
*Check your inbox* screen.

### `?next=` redirects

Authenticated users who follow a deep link to a protected page (e.g.
`/analytics`) are bounced to `/auth` and back. After a successful sign-in
the app navigates to the original URL automatically.

## Forgot password

1. From `/auth`, click **Forgot password?**
2. Enter your account email and click **Send reset link**.
3. Check your inbox for a link from Supabase.
4. Click the link — RINK opens with a *Set a new password* form.
5. Enter a new password twice and click **Update password**.

After updating, you're signed in and redirected to the workspace.

> **Reset links expire after one hour** (Supabase default). If yours has
> expired, just request a fresh link.

## Sign out

Click the avatar in the top-right of the navbar, then **Sign out**.

When you sign out, RINK does three things:

1. Sends `DELETE /api/user-data` to the gateway, which forwards to the ML
   service. Your uploaded CSV and trained model are removed from disk.
2. Calls `supabase.auth.signOut()` to invalidate the access token.
3. Clears the local activity stamp and navigates to the home page.

## Idle timeout

Sessions auto-terminate after **4 hours of inactivity**. The clock resets
on any of these events: mousedown, keydown, scroll, touch, click, focus.

Implementation details:

- Activity is stamped to `localStorage` (key `rink:lastActivity`),
  throttled to once every 30 seconds.
- A 60-second interval polls the stamp; if it's older than 4 hours, RINK
  triggers the same sign-out flow as a manual click — including the
  server-side cleanup.
- The stamp is shared across browser tabs, so being active in any tab
  keeps all of them alive.
- Reloading the page does **not** reset the stamp. If you reload after a
  4-hour-plus break, you'll be signed out immediately.

To raise or lower the timeout, edit `IDLE_TIMEOUT_MS` in
`client/src/contexts/AuthContext.jsx`.

## Passkeys

Passkeys are a passwordless way to sign in using public-key cryptography.
Your device stores a private key (secured by Face ID / Touch ID / Windows
Hello / a hardware key); we store the matching public key. Sign-in is
faster than typing a password and immune to phishing.

### Registering a passkey

1. Sign in to RINK (with any method — email/password or SSO).
2. Go to **Profile** (avatar menu → Profile).
3. Scroll to the **Passkeys** card.
4. Optionally give it a friendly name (e.g. *MacBook Touch ID*).
5. Click **Register passkey**.
6. Your OS prompts you to authenticate — that's it.

You can register multiple passkeys per account (one per device is typical).
Each passkey is independent; removing one doesn't affect the others.

### Signing in with a passkey

1. Open [rinkglobal.com/auth](https://rinkglobal.com/auth).
2. Click **Sign in with passkey**.
3. The browser shows the passkeys available for `rinkglobal.com` — pick one.
4. Authenticate locally; you're signed in.

The passkey itself never leaves your device. We only see a signed
challenge response, which we verify against the public key on file.

### Managing passkeys

The Profile page lists all your registered passkeys with:

- The friendly name (or "Unnamed passkey").
- When it was added.
- When it was last used.
- Whether it's a synced (cross-device) passkey or device-bound.

Click **Remove** next to any passkey to delete it. The corresponding
private key on your device becomes unusable for sign-in.

### Lost-device recovery

If you lose access to your only passkey:

1. Use **Forgot password** to reset via email — that signs you in.
2. Visit Profile and register a fresh passkey from the new device.

If you have multiple passkeys registered, just use any other one.

## Single sign-on (SSO)

RINK supports OAuth sign-in from:

- **Google** — most universal option.
- **GitHub** — best for technical teams.
- **Microsoft** — enterprise / Azure AD.
- **LinkedIn** — B2B identity.

Selecting a provider on the sign-in page redirects you out to their
consent screen. Once you approve, the provider returns you to RINK with a
verified email and we create or link an account automatically.

> **First-time vs returning.** If your email already has a password
> account, the OAuth sign-in is linked to it on the server side, so all
> your data stays connected. If you sign up via OAuth first and later set
> a password, both methods will work.

## Profile data

Available user metadata fields (editable from the Profile page):

- `display_name` — first + last name combined.
- `first_name`, `last_name` — separate fields.
- `phone` — optional, free-form.

Email and password are also editable from Profile. Changing email
triggers a verification flow against the new address; the change isn't
effective until that link is clicked.
