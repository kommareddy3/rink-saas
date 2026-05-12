# Deployment

This guide condenses the steps from
[`DEPLOYMENT_GUIDE.md`](https://github.com/rinkglobal/rink-saas-v3-ml/blob/main/DEPLOYMENT_GUIDE.md)
into a quick reference. For full step-by-step instructions, see that file.

## Topology

You'll deploy four services to three providers:

| Service          | Provider | Plan       | URL                          |
| ---------------- | -------- | ---------- | ---------------------------- |
| ML service       | Render   | Starter    | `rink-ml.onrender.com`       |
| API gateway      | Vercel   | Hobby/Pro  | `api.rinkglobal.com`         |
| Frontend (SPA)   | Vercel   | Hobby/Pro  | `rinkglobal.com`             |
| Documentation    | Vercel   | Hobby/Pro  | `docs.rinkglobal.com`        |

Plus:

- **Supabase** (free) for auth.
- **Groq** (pay-per-use) for the AI assistant.

## Order of operations

1. **Render** — deploy the ML service first. Note the URL.
2. **Vercel `rink-api`** — deploy the gateway with `ML_API_URL` pointing
   at the Render URL.
3. **Vercel `rink-web`** — deploy the SPA with `VITE_API_BASE_URL` pointing
   at the gateway.
4. **Vercel `rink-docs`** — deploy the docs site (this page is hosted there!).
5. **DNS** — point all subdomains at their respective Vercel projects.

## Environment variable matrix

### Render → `rink-ml`

| Variable             | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `RINK_DATA_DIR`      | `/var/data` (set by `render.yaml`)                                 |
| `ALLOWED_ORIGINS`    | `https://rinkglobal.com,https://www.rinkglobal.com`                |
| `PYTHON_VERSION`     | `3.11.9` (set by `render.yaml`)                                    |
| `GATEWAY_SECRET`     | (recommended) a long random string                                 |

### Vercel → `rink-api`

| Variable                       | Value                                                      |
| ------------------------------ | ---------------------------------------------------------- |
| `ML_API_URL`                   | `https://rink-ml.onrender.com`                             |
| `GROQ_API_KEY`                 | a fresh key from console.groq.com                           |
| `GROQ_MODEL`                   | `llama-3.3-70b-versatile` (default)                         |
| `SUPABASE_URL`                 | `https://YOUR-REF.supabase.co`                             |
| `SUPABASE_ANON_KEY`            | the anon key from Supabase dashboard                       |
| `SUPABASE_SERVICE_ROLE_KEY`    | service-role key — required for passkeys + welcome emails  |
| `ALLOWED_ORIGINS`              | `https://rinkglobal.com,https://www.rinkglobal.com`        |
| `GATEWAY_SECRET`               | the **same** value as on Render                            |
| `RESEND_API_KEY`               | (optional) Resend API key for welcome emails               |
| `WELCOME_FROM_EMAIL`           | (optional) e.g. `RINK <hello@mail.rinkglobal.com>`         |
| `PASSKEY_RP_NAME`              | `RINK Global Services`                                     |
| `PASSKEY_RP_ID`                | `rinkglobal.com` (apex domain, no protocol)                |
| `PASSKEY_RP_ORIGIN`            | `https://rinkglobal.com`                                   |

### Vercel → `rink-web`

| Variable                  | Value                                |
| ------------------------- | ------------------------------------ |
| `VITE_API_BASE_URL`       | `https://api.rinkglobal.com`         |
| `VITE_SUPABASE_URL`       | `https://YOUR-REF.supabase.co`       |
| `VITE_SUPABASE_ANON_KEY`  | the anon key from Supabase dashboard |

### Vercel → `rink-docs`

No env vars required — pure static site.

## Vercel project settings

| Project       | Root directory | Framework preset |
| ------------- | -------------- | ---------------- |
| `rink-api`    | `/`            | Other            |
| `rink-web`    | `/client`      | Vite             |
| `rink-docs`   | `/docs`        | Other            |

## DNS records

For each subdomain, Vercel will display the exact record to add. As a
guideline:

| Subdomain              | Type   | Value                       |
| ---------------------- | ------ | --------------------------- |
| `rinkglobal.com`       | A      | `76.76.21.21`               |
| `www.rinkglobal.com`   | CNAME  | `cname.vercel-dns.com`      |
| `api.rinkglobal.com`   | CNAME  | `cname.vercel-dns.com`      |
| `docs.rinkglobal.com`  | CNAME  | `cname.vercel-dns.com`      |

Cloudflare-fronted domains: set the proxy status to **DNS Only** (gray
cloud), not proxied — Vercel needs to handle TLS itself.

## Smoke-test commands

After deploy:

```bash
# Health
curl https://api.rinkglobal.com/api/health

# Frontend
open https://rinkglobal.com

# Docs
open https://docs.rinkglobal.com
```

For a more thorough check, run the included script:

```bash
git clone https://github.com/rinkglobal/rink-saas-v3-ml
cd rink-saas-v3-ml
cp server/.env.example server/.env  # fill in real values
API_BASE=https://api.rinkglobal.com node scripts/check-deploy.js
```

It exercises every gateway route (auth gates, Groq, ML proxy, CORS) and
reports pass/fail for each.

## Free-tier alternative

To run everything for $0/month while in beta, set Render to `plan: free`
in `ml_api/render.yaml`. Trade-offs:

- Cold starts (~30 s after 15 min idle).
- No persistent disk — uploaded CSVs and trained models are lost on every
  spin-down.

The user-facing impact is that someone returning after a long idle period
will need to re-upload their CSV. Acceptable for beta; not for production.

## Cost summary

| Item                       | Cost                  |
| -------------------------- | --------------------- |
| Render Starter (1 service) | $7 / month            |
| Render persistent disk (1 GB) | ~$0.25 / month     |
| Vercel Hobby (3 projects)  | $0                    |
| Supabase Free              | $0                    |
| Groq API                   | usage-based, ~$0.10 / 1k requests at LLama-3.3-70B |
| Domain                     | ~$15 / year (rinkglobal.com)            |

Total for low beta volume: **~$8 / month** + variable Groq costs.
