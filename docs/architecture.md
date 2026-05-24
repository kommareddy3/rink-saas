# Architecture

RINK is a three-tier application. Each tier has a focused job and a clean
interface to the next.

```
┌──────────────┐   HTTPS    ┌────────────────────┐   HTTPS   ┌────────────────────┐
│  React app   │  ────────▶ │  Express gateway   │ ───────▶  │  FastAPI ML service │
│  (Vercel)    │ Bearer JWT │  (Vercel)          │ X-User-ID │  (Render)           │
└──────────────┘            └────────────────────┘           └────────────────────┘
        │                              │                                │
        ├── Supabase auth ─────────────┘                                │
        │   (sign-in, JWT, recovery)                                    │
        │                                                               │
        └── Groq LLM (AI Assistant proxied through gateway)             │
                                                                        │
                                                  Per-user state on disk
                                                  /var/data/users/<uuid>/
```

## Tier 1 — React frontend

**Stack:** React 18 + Vite + Tailwind + Recharts + React Router.

**Hosted on:** Vercel as a static SPA at `rinkglobal.com`.

**Responsibilities:**

- Auth UI (sign-up, sign-in, password reset, idle timeout).
- Workspace UI (upload, train, predict, visualise).
- Talks **only** to the Express gateway — never to the ML service or
  Supabase admin endpoints directly.

The Supabase JS client handles tokens client-side. Every gateway request
gets `Authorization: Bearer <access_token>` attached via the axios
interceptor in `src/api.js`.

## Tier 2 — Express gateway

**Stack:** Node.js 18+ on Express 4.

**Hosted on:** Vercel as a serverless function (`api/index.js` re-exports the
Express app) at `api.rinkglobal.com`.

**Responsibilities:**

- **Authentication.** Verifies every request's bearer token with
  `supabase.auth.getUser(token)`. Failures return `401`.
- **CORS.** Allow-listed origins via the `ALLOWED_ORIGINS` env var.
- **AI assistant proxy.** Calls Groq with the configured model
  (`llama-3.3-70b-versatile` by default). Includes a system prompt that
  scopes the assistant to ML/forecasting topics.
- **ML proxy.** Forwards `/api/upload`, `/api/analyze`, `/api/train`,
  `/api/predict`, `/api/data`, and `/api/user-data` to FastAPI. Adds
  `X-User-ID: <supabase_uuid>` and (optionally) `X-Gateway-Secret` to
  every call. Train bodies and data query params (group, date window,
  excludes) pass straight through.
- **File staging.** Uploads use Multer in-memory (Vercel's filesystem is
  read-only) and stream the file to FastAPI as multipart.

## Tier 3 — FastAPI ML service

**Stack:** Python 3.11 + FastAPI + scikit-learn + pandas + cryptography
(Fernet, for encryption at rest).

**Hosted on:** Render Starter ($7/mo) with a 1 GB persistent disk at
`/var/data`.

**Responsibilities:**

- **Upload scanning + encryption at rest.** Uploads are scanned for
  binary/archive/executable signatures and null bytes (rejected with
  `400`), then **encrypted with Fernet (AES-128-CBC + HMAC)** before the
  first disk write. Plaintext never lands on disk. See [Security](/security).
- Per-user file storage under `/var/data/users/<user_id>/`:
  - `uploaded.csv` — the user's last-uploaded dataset, **encrypted at rest**.
  - `model.joblib` — the trained `GradientBoostingRegressor`.
  - `meta.joblib` — column / date / group / frequency metadata.
- **Schema profiling** (`/analyze`) — date/value detection and
  panel/ID-column detection for grouped data.
- Date column detection and chronological sort.
- Frequency inference (daily / weekly / monthly / quarterly / yearly),
  robust to duplicate timestamps in panel data.
- **Group-aware, windowed training** — filter to one group, a custom
  `train_start`/`train_end` window, and/or excluded date ranges.
- **Univariate or multivariate** — optional `feature_columns` add exogenous
  predictors (target lags + lagged covariates), with per-predictor
  component models so covariates can be advanced during recursion.
- Feature engineering: lags `[1, 2, 3, 5, 7]`, rolling means `[3, 7]`.
- Train / validate / save / load.
- Recursive multi-step prediction (up to 1825 steps).
- `DELETE /user-data` — wipes the calling user's directory.

## Authentication flow

1. User signs in on `rinkglobal.com/auth`.
2. Supabase issues a JWT (access token, default 1-hour TTL) and a refresh
   token. Both are stored by the Supabase JS client.
3. Every API call from the SPA includes
   `Authorization: Bearer <access_token>`.
4. The Express gateway calls `supabase.auth.getUser(token)` to verify.
   If valid, `req.user.id` is set to the Supabase UUID.
5. The gateway forwards the user UUID to FastAPI in `X-User-ID`.
6. FastAPI scopes all file paths to that UUID.

A 4-hour client-side idle timeout adds a session ceiling on top of
Supabase's token TTL — see [Accounts](/guides/account#idle-timeout).

## Data lifecycle

```
                                signs up         uploads CSV       trained model      signs out / idle
User
                                    │                │                   │                    │
                                    ▼                ▼                   ▼                    ▼
Supabase                       creates UUID                                              token revoked
                                    │
                                    ▼
Express gateway                                  X-User-ID to FastAPI
                                                    │
                                                    ▼
FastAPI                                       /var/data/users/<uuid>/
                                                  uploaded.csv         model.joblib           rmtree()
```

Users own their data while signed in. The moment they sign out (manual or
idle), the gateway issues `DELETE /api/user-data` and the ML service
removes their directory. While stored, the CSV sits **encrypted at rest**
and travels only over TLS — see [Security & data protection](/security)
for the full model.

## Deployment topology

| Service          | Platform | URL                          | Plan         |
| ---------------- | -------- | ---------------------------- | ------------ |
| Frontend         | Vercel   | `rinkglobal.com`             | Hobby (free) |
| Express gateway  | Vercel   | `api.rinkglobal.com`         | Hobby (free) |
| FastAPI ML       | Render   | `rink-ml.onrender.com`       | Starter ($7) |
| Documentation    | Vercel   | `docs.rinkglobal.com`        | Hobby (free) |
| Auth + database  | Supabase | `<project>.supabase.co`      | Free         |
| LLM (assistant)  | Groq     | `api.groq.com`               | Pay-per-use  |

Total monthly cost at low volume: ~$7 + Groq usage.
