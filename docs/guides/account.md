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

1. Go to [rinkglobal.com/auth](https://rinkglobal.com/auth).
2. Enter your email and password.
3. Click **Sign in**.

If you've never confirmed your email, sign-in will fail and you'll be sent
back to the *Check your inbox* screen.

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

## Profile data

Available user metadata fields (set during sign-up):

- `display_name` — first + last name combined.
- `first_name`, `last_name` — separate fields.
- `phone` — optional, free-form.

Currently there is no in-app profile editor; metadata can be edited via the
Supabase dashboard or the Supabase JS API.
