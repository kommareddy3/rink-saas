# FAQ & Troubleshooting

Quick answers to the questions everyone asks. If yours isn't here,
[contact the team](https://rinkglobal.com/contact).

## Data & uploads

### My CSV is sorted newest-to-oldest. Will RINK handle it?

Yes. RINK detects the date column and **sorts ascending** before training.
"Most recent" always means the last row after upload, regardless of how
your file is ordered.

### Why is my forecast almost flat?

Two common causes:

1. **Recursive feedback dampens out fast** with simple lag features. The
   model converges toward the running mean within ~10–20 steps. This is a
   property of the model class, not a bug.
2. **You forecasted past where the signal is informative.** Try a shorter
   horizon and a column with more variance.

If you see truly flat output (every step identical), you're probably
predicting outside the model's training range; check that the input
values you supply are reasonable for the column.

### Where did my uploaded CSV go?

When you upload, the file is forwarded to the ML service and saved at
`/var/data/users/<your_uuid>/uploaded.csv`. It stays there until:

- You upload a new CSV (replaces the old one).
- You sign out (manual or idle, after 4 hours).
- An admin runs maintenance on the ML service.

The file is **never** stored on the gateway or your browser.

### Can I export my forecast values?

Not yet — copy them out of the workspace tiles or the chart tooltip. A
CSV export is on the roadmap.

### Why does my chart show demo values?

Either you haven't uploaded yet, or you signed out (which wipes server
files) and signed back in. Re-upload your CSV.

## Accounts & sign-in

### Why was I logged out?

Three reasons it can happen:

1. **You signed out manually.** Click the avatar → Sign out.
2. **4-hour idle timeout.** If you don't interact with the page for four
   hours, RINK signs you out automatically — see
   [Idle timeout](/guides/account#idle-timeout).
3. **Token expired and refresh failed.** Rare; usually network related.

### I didn't get the confirmation email.

- Check spam.
- Click **Resend confirmation email** on the *Check your inbox* screen.
- Verify the email isn't throwaway/disposable — Supabase blocks many of
  those.

### I forgot my password.

Use [rinkglobal.com/auth?mode=forgot](https://rinkglobal.com/auth?mode=forgot).
You'll get a reset link by email; clicking it opens the *Set a new
password* form. Reset links expire in one hour.

### Can I delete my account?

Currently only via Supabase dashboard. In-app account deletion is on the
roadmap.

## API & integrations

### Can I call RINK from Python / a script?

Yes — see [API Authentication](/api/authentication#obtaining-a-token).
Sign in with the Supabase REST endpoint, get an access token, and use it
in the `Authorization` header for all `/api/*` calls.

### Are there rate limits?

Not in the gateway itself. The constraining limits are:

- Groq's own rate limits on the AI assistant.
- Render Starter's CPU on the ML service.
- Vercel's invocation budget on the gateway.

For a typical beta, you won't hit any of these.

### Is there a webhook for "training complete"?

Not yet. `/api/upload` and `/api/train` block until the model is fitted,
which is fast enough that webhooks would be over-engineering at the
current scale.

## Deployment

### `Could not resolve host: api.rinkglobal.com`

DNS hasn't propagated yet. Wait 5–15 minutes after adding the record. To
test before propagation, use the Vercel-assigned URL
(`rink-api-xxx.vercel.app`).

### Render build fails with `error: failed to create directory cargo`

Python is auto-resolved to a too-new version (e.g. 3.14) for which
`pydantic-core` and `numpy` lack wheels. Pin Python via:

- `ml_api/.python-version` containing `3.11.9`
- `ml_api/runtime.txt` containing `python-3.11.9`
- `PYTHON_VERSION=3.11.9` in `render.yaml`'s `envVars`

All three are in the repo by default.

### Vercel deploy: `pattern "server/server.js" doesn't match any Serverless Functions`

Older `vercel.json` style. The current setup uses an `api/index.js`
wrapper that re-exports the Express app. Make sure your deploy pulls the
latest `api/`, `package.json`, and `vercel.json` from the repo root.

### My Groq API key was committed to git accidentally.

1. Revoke it at [console.groq.com](https://console.groq.com).
2. Generate a new one.
3. Set it only in Vercel env vars (never in `.env` files that might
   commit).
4. Run `git ls-files | grep -E '\.env(\.|$)'` — output should be empty.

## Operations

### How do I see who's signed up?

Supabase dashboard → **Authentication → Users**.

### How do I see who's actively using the workspace?

Render logs for the ML service show every `/upload`, `/train`, `/predict`,
and `/data` call, tagged with the user UUID. Vercel logs show every
gateway hit. Cross-reference for activity patterns.

### How do I clean up a user's data manually?

```bash
# On Render: shell into the service or use the Render CLI
ls /var/data/users/
rm -rf /var/data/users/<uuid>
```

Or call the API on their behalf with their access token.

## Still stuck?

- Browse the [Guides](/guides/) for step-by-step walkthroughs.
- Open the [API Reference](/api/) for exact request/response shapes.
- [Contact the team](https://rinkglobal.com/contact).
