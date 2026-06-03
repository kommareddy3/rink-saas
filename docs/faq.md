# FAQ & Troubleshooting

Quick answers to the questions everyone asks. If yours isn't here,
[contact the team](https://rinkglobal.com/contact).

## Data security & privacy

### Is my uploaded data encrypted?

Yes. Every CSV — and every report you generate — is **encrypted at rest**
with Fernet (AES-128-CBC + an HMAC-SHA256 integrity tag) **before** it
reaches storage (Cloudflare R2), so the storage provider never sees
plaintext. It's also encrypted in transit (HTTPS on every hop) and only
decrypted transiently in memory to serve *your* forecasts and downloads. The
full model is on the [Security](/security) page.

### Who can see my data?

Only you. Each user's files live in a directory keyed to their own user
ID, every request is authenticated, and there is no endpoint that returns
another user's data. We don't sell or share your data, and we don't train
any shared/global model on it — every model is fit only on your dataset.

### How long do you keep my files?

Up to **90 days**. Datasets and reports are retained for at most 3 months,
then deleted automatically by a storage lifecycle rule — so you can return to
your work and re-download past reports across sessions. You can also delete
everything instantly from your profile, or remove individual reports. Signing
out does **not** delete your data. Re-uploading replaces the previous dataset.

### Do you scan uploads?

Yes — twice. First a format guard rejects anything that isn't a real CSV
(executables, archives, PDFs, images, gzip, and files with binary/null
bytes). Then an antivirus scan via **VirusTotal** checks the file's hash
against dozens of engines and rejects anything flagged malicious — before it
is stored. Reports are scanned the same way. See
[virus & upload scanning](/security#virus-upload-scanning).

### Is the AI assistant sent my data?

No. The assistant answers RINK and forecasting questions and is **not** given
your uploaded dataset.

## Data & uploads

### My data has many rows per date (per store, per city…). Can RINK forecast it?

Yes — that's **panel/grouped data**. RINK detects it automatically,
suggests the group/ID column, and shows a **Training Scope** card where
you pick one group (e.g. one store) to forecast a clean single series.
Leaving it on *All groups* trains on the combined data. See
[Uploading → panel data](/guides/uploading#panel-grouped-data).

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

When you upload, the file is forwarded to the ML service, scanned,
encrypted, and saved to object storage under
`users/<your_uuid>/uploaded.csv`. It stays there until:

- You upload a new CSV (replaces the old one).
- You delete your data from your profile.
- It reaches the 90-day retention limit and is auto-deleted.

The file is **never** stored on the gateway or your browser, and never
written to storage in plaintext. Signing out does not delete it.

### Can I export my forecast values?

Yes. The **Forecast Detail** card on the Forecasting page has two CSV
exports in the top-right:

- **Forecast.csv** — one row per predicted step, with `step`, `date`,
  `label`, `<column>_predicted`, `ci_low`, and `ci_high`. The confidence
  band widens with the horizon (×1.0, ×1.25, ×1.5, …) using the model's
  RMSE.
- **Full series.csv** — every visible point in one file: historical
  `<column>_actual`, plus `<column>_predicted` and the CI columns for the
  forecast portion. Drop it into Excel/Sheets and rebuild the chart
  yourself.

Both files include a UTF-8 BOM so Excel detects the encoding correctly,
and are named like `rink-forecast-pmms30-2026-05-14.csv`.

The same export utility is available in
[`client/src/utils/csv.js`](https://github.com/rinkglobal/rink-saas-v3-ml/blob/main/client/src/utils/csv.js)
if you're embedding RINK in your own workflow.

### Why does my chart show demo values?

Either you haven't uploaded yet, or your data passed the 90-day retention
limit (or you deleted it) and was removed. Re-upload your CSV.

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

The cleanest way is the API — call `DELETE /api/user-data` on their behalf
with their access token, which removes their entire `users/<uuid>/` namespace
(datasets + reports) from cloud storage and disk.

For storage configured with Cloudflare R2, you can also delete the
`users/<uuid>/` prefix from the R2 dashboard. For the local-disk fallback:

```bash
# On Render: shell into the service or use the Render CLI
ls "$RINK_DATA_DIR/users/"
rm -rf "$RINK_DATA_DIR/users/<uuid>"
```

All datasets and reports are also auto-deleted after 90 days by the R2
lifecycle rule (see [Cloud storage setup](/CLOUD_STORAGE_SETUP)).

## Still stuck?

- Browse the [Guides](/guides/) for step-by-step walkthroughs.
- Open the [API Reference](/api/) for exact request/response shapes.
- [Contact the team](https://rinkglobal.com/contact).
