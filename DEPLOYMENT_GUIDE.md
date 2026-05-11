# Deploying RINK Global Services to rinkglobal.com

This guide assumes you own `rinkglobal.com` and have GitHub, Vercel, Render,
Supabase, and Groq accounts.

You will deploy four services:

| Service       | Hosting | URL (suggested)              |
| ------------- | ------- | ---------------------------- |
| Frontend      | Vercel  | `https://rinkglobal.com`     |
| API gateway   | Vercel  | `https://api.rinkglobal.com` |
| ML service    | Render  | `https://rink-ml.onrender.com` (kept private; only the gateway calls it) |
| Documentation | Vercel  | `https://docs.rinkglobal.com` |

## 0. One-time prep

```bash
git init
git add .
git commit -m "Initial production-ready commit"
git remote add origin git@github.com:YOUR_USER/rink-saas-v3-ml.git
git push -u origin main
```

Then **rotate the Groq API key**: go to <https://console.groq.com>, revoke the
old key, generate a new one. The old key was in `server/.env` on disk — treat
it as compromised.

## 1. Deploy the ML service to Render (Starter plan)

1. Go to <https://render.com> → **New** → **Blueprint**.
2. Connect your GitHub repo.
3. Render reads `ml_api/render.yaml` and proposes a `rink-ml` web service on
   the **Starter** plan with a 1 GB persistent disk attached at `/var/data`.
4. Click **Apply** and confirm the billing prompt.
5. When the build finishes, copy the service URL — e.g. `https://rink-ml.onrender.com`.
6. Verify it is up: `curl https://rink-ml.onrender.com/health`.

### What you're paying for

- **Starter plan: $7 / month.** Always-on (no spin-down), 512 MB RAM, 0.5 CPU.
- **1 GB persistent disk: ~$0.25 / month.** Uploaded CSVs and trained models
  survive restarts, redeploys, and platform maintenance.
- **Free custom domain + auto-TLS.** If you want `ml.rinkglobal.com` to point
  at this service, add it under Settings → Custom Domain.

### Scaling later

If a customer uploads a very large CSV and you see OOM errors in Render logs,
flip `plan: starter` to `plan: standard` in `render.yaml` and push — that
gives you 2 GB RAM and 1 full CPU for $25/mo. No code changes needed.

## 2. Deploy the API gateway to Vercel

The Express app in `server/server.js` is exposed to Vercel through
`api/index.js` (Vercel's required Serverless Function convention) and
the root `package.json` (so Vercel knows what to `npm install`).

1. <https://vercel.com> → **Add New Project** → import the same GitHub repo.
2. **Project name:** `rink-api`.
3. **Root directory:** leave at repo root (`/`).
4. **Framework preset:** Other.
5. **Build / Install commands:** leave the defaults — Vercel will run
   `npm install` against the root `package.json` and treat
   `api/index.js` as the Serverless Function.
6. **Environment variables** (Production scope):

   | Key                    | Value                                                              |
   | ---------------------- | ------------------------------------------------------------------ |
   | `ML_API_URL`           | The Render URL from step 1                                         |
   | `GROQ_API_KEY`         | Your **new** Groq key                                              |
   | `GROQ_MODEL`           | `llama-3.3-70b-versatile` (optional)                               |
   | `SUPABASE_URL`         | `https://YOUR-REF.supabase.co`                                     |
   | `SUPABASE_ANON_KEY`    | Supabase anon key                                                  |
   | `ALLOWED_ORIGINS`      | `https://rinkglobal.com,https://www.rinkglobal.com`                |

7. Deploy. Note the URL Vercel gives you.
8. **Add custom domain:** Settings → Domains → add `api.rinkglobal.com`.
   Vercel will show you the DNS record to create (usually a CNAME to
   `cname.vercel-dns.com`).

## 3. Deploy the frontend to Vercel

1. <https://vercel.com> → **Add New Project** → import the same GitHub repo.
2. **Project name:** `rink-web`.
3. **Root directory:** `client`.
4. **Framework preset:** Vite.
5. **Environment variables** (Production scope):

   | Key                       | Value                                |
   | ------------------------- | ------------------------------------ |
   | `VITE_API_BASE_URL`       | `https://api.rinkglobal.com`         |
   | `VITE_SUPABASE_URL`       | `https://YOUR-REF.supabase.co`       |
   | `VITE_SUPABASE_ANON_KEY`  | Supabase anon key                    |

6. Deploy.
7. **Add custom domain:** Settings → Domains → add `rinkglobal.com` and
   `www.rinkglobal.com`. Follow Vercel's DNS instructions (typically point your
   apex `A`/`ALIAS` records and `www` `CNAME` at Vercel).

## 3b. Deploy the documentation site to Vercel

1. <https://vercel.com> → **Add New Project** → import the same GitHub repo.
2. **Project name:** `rink-docs`.
3. **Root directory:** `docs`.
4. **Framework preset:** Other (auto-detected as VitePress).
5. No environment variables required.
6. Deploy. Note the URL.
7. **Add custom domain:** Settings → Domains → add `docs.rinkglobal.com`.
   Vercel will show the DNS record to create (usually
   `CNAME docs → cname.vercel-dns.com`).
8. Open <https://docs.rinkglobal.com> — you should see the docs landing page.

## 4. Configure Supabase

1. <https://app.supabase.com> → your project → **Authentication → URL
   Configuration**.
2. Set **Site URL** to `https://rinkglobal.com`.
3. Add `https://rinkglobal.com/**` to **Redirect URLs** (and a localhost entry
   if you want to keep dev working).
4. Confirm email signups work end-to-end.

## 5. Smoke test

```bash
# Health
curl https://api.rinkglobal.com/api/health
# → { api: "ok", ml: "ok", groq: "configured", auth: "configured" }

# Frontend loads
open https://rinkglobal.com
```

In the browser:

1. Sign up / log in.
2. Visit `/analytics`.
3. Upload a CSV with a numeric column.
4. Confirm metrics appear and predictions render on the chart.
5. Open the AI assistant (bottom-right) and ask a question.

## 6. Things to do before announcing

- [ ] Rotate the Groq key (mentioned in step 0).
- [ ] Run `git ls-files | grep -E '\.env(\.|$)'` — must return nothing.
- [ ] Add a real **Privacy Policy** and **Terms** before collecting customer data.
- [ ] Decide on a paid Render plan to avoid cold starts.
- [ ] Add Vercel Analytics or another monitoring tool.
- [ ] Set up Supabase row-level security on any data tables you add.
- [ ] Configure custom email templates in Supabase (signup confirmation, etc.).

## Troubleshooting

**`/api/health` shows `ml: unreachable`**
The Render service is asleep or crashed. Check Render logs. Confirm
`ML_API_URL` in Vercel env matches the Render URL exactly (no trailing slash).

**`401 Invalid or expired token` from `/api/upload`**
The frontend isn't sending a Supabase session. Make sure the user is logged
in. The API gateway calls `supabase.auth.getUser(token)` — confirm
`SUPABASE_URL` and `SUPABASE_ANON_KEY` in the gateway env match the Supabase
project the frontend uses.

**`CORS Origin not allowed`**
Add the offending origin to `ALLOWED_ORIGINS` in the gateway env vars and
redeploy.

**`No module named 'statsmodels'`** (or any other ML import error)
You're on an old commit. The current `ml_api/main.py` does not use
`statsmodels`. Pull `main`.
