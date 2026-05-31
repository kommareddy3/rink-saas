# RINK Data Analytics — SaaS Frontend

The product surface for RINK Data Analytics: home page, sign-in, workspace,
and the seven analytics tools. Deployed as its **own Vercel project** at
`analytics.rinkglobal.com`. The marketing site (`rinkglobal.com`) lives in
[`../client`](../client) and is a separate Vercel project.

Both apps share the same backend at `api.rinkglobal.com` (Express server in
[`../server`](../server)) and the same Supabase project for auth.

---

## Why two Vercel projects?

We split the monorepo into two deployments after pivoting the marketing
brand to IT consulting / staffing while keeping the SaaS as our product
proof. Each app has its own:

| Concern               | Marketing (`client/`)              | SaaS (`analytics/`)                  |
| --------------------- | ---------------------------------- | ------------------------------------ |
| Domain                | `rinkglobal.com`                   | `analytics.rinkglobal.com`           |
| Theme                 | Light (corporate trust)            | Dark (product workspace)             |
| Audience              | Vendors, end clients, recruiters   | Existing customers, free-trial users |
| Routes owned          | `/`, `/about`, `/careers`, legal   | `/`, `/auth`, `/analytics`, `/tools/*`, `/profile` |
| Auth required?        | No                                 | Yes (Supabase + passkeys)            |
| Vercel root directory | `client/`                          | `analytics/`                         |

Cross-app navigation is handled by **mutual redirects**: hitting an unknown
URL on either app bounces to the canonical site preserving the path/query/hash,
so old bookmarks always land in the right place.

---

## Local development

```bash
cd analytics
npm install
cp .env.example .env       # fill in Supabase + API URL
npm run dev                # http://localhost:5174
```

The dev server runs on port **5174** so it doesn't collide with the
marketing site (port 5173).

### Required env vars

```
VITE_API_BASE_URL=http://localhost:8080      # local Express
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_MARKETING_URL=http://localhost:5173      # for the catch-all redirect
```

If `VITE_API_BASE_URL` is empty, [`src/config.js`](src/config.js) falls back
to `${window.location.origin}/api`, which is wrong outside of the legacy
single-deployment setup — always set it explicitly.

---

## Vercel deployment

### 1. Create the project

In the Vercel dashboard:

1. **Add New… → Project**, select the same Git repository as the marketing site.
2. On the configuration screen, set **Root Directory** to `analytics/`.
   This is the only thing that differs from the marketing project.
3. Framework Preset: **Vite** (auto-detected).
4. Build command: `npm run build` (default).
5. Output directory: `dist` (default).

### 2. Environment variables

Add these under **Settings → Environment Variables** for **Production**,
**Preview**, and **Development** as needed:

| Key                       | Production value                       | Notes                                  |
| ------------------------- | -------------------------------------- | -------------------------------------- |
| `VITE_API_BASE_URL`       | `https://api.rinkglobal.com`           | Express gateway (separate Vercel proj) |
| `VITE_SUPABASE_URL`       | `https://<project>.supabase.co`        | Same project as marketing site         |
| `VITE_SUPABASE_ANON_KEY`  | `eyJ...`                               | Anon key (safe to expose)              |
| `VITE_MARKETING_URL`      | `https://rinkglobal.com`               | For the catch-all redirect             |

### 3. Custom domain

1. **Settings → Domains → Add** → `analytics.rinkglobal.com`.
2. In your DNS provider, add a `CNAME` record:
   ```
   analytics    →    cname.vercel-dns.com
   ```
3. Wait for the SSL cert to provision (usually < 2 minutes).

### 4. Marketing-site env var

The marketing app needs to know where the SaaS lives. In the **marketing**
(`client/`) Vercel project, add:

| Key                      | Production value                       |
| ------------------------ | -------------------------------------- |
| `VITE_ANALYTICS_URL`     | `https://analytics.rinkglobal.com`     |

This is read by [`client/src/links.js`](../client/src/links.js) and used by
every "Try RINK Data Analytics", "Workspace", and "Sign in" link on the
marketing site. If unset, the code falls back to the same production URL,
so missing it just means previews can't override.

### 5. Supabase auth redirect URLs

Add both deployment URLs to **Supabase → Authentication → URL Configuration**:

- `https://analytics.rinkglobal.com`
- `https://analytics.rinkglobal.com/auth`
- `http://localhost:5174` (for local dev)

The Site URL should stay at `https://analytics.rinkglobal.com` (the SaaS
owns the auth surface — the marketing site never calls Supabase).

### 6. Express CORS

In `server/server.js` make sure both origins are in `CORS_ALLOWED_ORIGINS`
(comma-separated) on the Express Vercel project:

```
https://rinkglobal.com,https://www.rinkglobal.com,https://analytics.rinkglobal.com
```

---

## Architecture notes

### Route ownership

```
analytics.rinkglobal.com/                  → SaaS home (dark)
analytics.rinkglobal.com/auth              → sign in / register
analytics.rinkglobal.com/analytics         → workspace
analytics.rinkglobal.com/tools/anomaly     → anomaly detection
analytics.rinkglobal.com/tools/churn       → churn prediction
analytics.rinkglobal.com/tools/segmentation→ customer segmentation
analytics.rinkglobal.com/tools/abtest      → A/B test analyzer
analytics.rinkglobal.com/tools/tsp         → TSP optimiser
analytics.rinkglobal.com/tools/vrp         → VRP optimiser
analytics.rinkglobal.com/profile           → profile + passkeys
analytics.rinkglobal.com/changelog         → changelog
analytics.rinkglobal.com/*                 → redirect to rinkglobal.com<path>

rinkglobal.com/                            → marketing home (light)
rinkglobal.com/about, /careers, /contact   → marketing pages
rinkglobal.com/privacy, /terms, …          → legal pages
rinkglobal.com/auth, /analytics, /tools/*, /profile → redirect to analytics.rinkglobal.com<path>
```

The catch-all redirects on **both** sides mean old bookmarks resolve
correctly regardless of where the user landed first.

### Sessions don't cross subdomains

Supabase stores its session in `localStorage` by default. `localStorage` is
scoped per-origin, so signing in on `analytics.rinkglobal.com` does **not**
sign the user in on `rinkglobal.com` and vice versa. This is fine — the
marketing site has no protected content. If you ever want true SSO across
subdomains, switch Supabase to cookie storage with `Domain=.rinkglobal.com`.

### Orphaned files in `client/`

The marketing folder still contains the old SaaS pages (`Analytics.jsx`,
`Auth.jsx`, `AnomalyDetection.jsx`, etc.) and components
(`ProtectedRoute.jsx`, `PasskeyManager.jsx`, `SocialLoginButtons.jsx`,
`ReportStudio.jsx`, `ToolUI.jsx`). None of them are imported from
`client/src/App.jsx` anymore, so Vite tree-shakes them out of the
production bundle — but they're dead weight in source control. Clean them
up with:

```bash
cd client/src
git rm pages/{ABTest,Analytics,AnomalyDetection,Auth,ChurnPrediction,CustomerSegmentation,Dashboard,Login,ML,Profile,Register,TSP,Upload,VRP}.jsx
git rm components/{PasskeyManager,ProtectedRoute,ReportStudio,SocialLoginButtons,ToolUI}.jsx
git commit -m "client: remove orphaned SaaS pages (now in analytics/)"
```

---

## Going-live checklist

- [ ] Create Vercel project pointing at `analytics/`
- [ ] Add all 4 `VITE_*` env vars
- [ ] Add `analytics.rinkglobal.com` custom domain + CNAME
- [ ] Wait for SSL
- [ ] Add `VITE_ANALYTICS_URL` to the marketing Vercel project
- [ ] Add `https://analytics.rinkglobal.com` to Supabase Allowed Redirect URLs
- [ ] Add `https://analytics.rinkglobal.com` to Express `CORS_ALLOWED_ORIGINS`
- [ ] Smoke-test: hit `rinkglobal.com/analytics` → should bounce to `analytics.rinkglobal.com/analytics`
- [ ] Smoke-test: hit `analytics.rinkglobal.com/about` → should bounce to `rinkglobal.com/about`
- [ ] Smoke-test: sign in at `analytics.rinkglobal.com/auth`, confirm workspace loads
- [ ] Smoke-test: click "Try RINK Data Analytics (free)" on `rinkglobal.com` → opens analytics in new tab
