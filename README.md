# RINK Global Services

**Research Innovation & Next-gen Knowledge — Time-Series Forecasting Platform**

A three-tier SaaS for uploading time-series datasets, training a forecasting
model, and generating multi-step predictions through an interactive dashboard.

```
React (Vite) ── HTTPS ──► Express API gateway ── HTTPS ──► FastAPI ML service
   ▲                            │                                │
   │                            │  Supabase auth (JWT)           │  scikit-learn
   └── Supabase auth ───────────┘  Groq AI assistant             └── joblib model store
```

## Tech stack

| Layer        | Tech                                                |
| ------------ | --------------------------------------------------- |
| Frontend     | React 18, Vite, Tailwind CSS, Recharts              |
| Auth         | Supabase                                            |
| API gateway  | Node.js 18+, Express, Multer (in-memory)            |
| AI assistant | Groq (Llama-3.3-70B by default)                     |
| ML service   | FastAPI, scikit-learn (Gradient Boosting), pandas   |
| Hosting      | Vercel (frontend + gateway), Render Starter (ML)    |

The forecasting model uses **engineered lag and rolling-window features** fed
into a `GradientBoostingRegressor`. Forecasts are produced **recursively** for
N steps. The CSV column to forecast is auto-detected (`value`, `y`, `target`,
`close`, `price`, `pmms30`, or first numeric column).

## Project layout

```
rink-saas-v3-ml/
├── api/           # Vercel Serverless Function entry (re-exports server/)
├── client/        # React + Vite frontend (deploy to Vercel)
├── server/        # Express API gateway code
├── ml_api/        # FastAPI ML service (deploy to Render)
├── package.json   # Root deps installed by Vercel
├── vercel.json    # Backend deploy config
└── DEPLOYMENT_GUIDE.md
```

## Local development

You need three terminals.

### 1. ML service (FastAPI)

```bash
cd ml_api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: <http://localhost:8000/docs>

### 2. API gateway (Express)

```bash
cd server
cp .env.example .env       # then fill in your real values
npm install
npm run dev                # listens on :5001
```

### 3. Frontend (Vite)

```bash
cd client
cp .env.example .env.local # then fill in your real values
npm install
npm run dev                # listens on :5173
```

Open <http://localhost:5173>.

## Required environment variables

### Server (`server/.env`)

```
ML_API_URL=http://localhost:8000
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=https://YOUR-REF.supabase.co
SUPABASE_ANON_KEY=...
ALLOWED_ORIGINS=http://localhost:5173,https://rinkglobal.com,https://www.rinkglobal.com
```

### Client (`client/.env.local`)

```
VITE_API_BASE_URL=http://localhost:5001
VITE_SUPABASE_URL=https://YOUR-REF.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

## API surface

All ML routes require `Authorization: Bearer <supabase-access-token>`.

| Method | Path                  | Purpose                                                  |
| ------ | --------------------- | -------------------------------------------------------- |
| GET    | `/`                   | Liveness                                                 |
| GET    | `/api/health`         | Reports gateway, ML service, Groq, and auth status       |
| POST   | `/api/ai-assistant`   | Chat with the Groq-backed assistant                      |
| POST   | `/api/upload`         | Upload a CSV (multipart, field `file`); auto-trains      |
| POST   | `/api/train`          | Re-train the model on the persisted dataset             |
| POST   | `/api/predict`        | Body `{ values: number[], steps: number }`               |
| GET    | `/api/data?limit=N`   | Last N actual values from the persisted dataset          |

## Deploying to rinkglobal.com

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for the full walkthrough.
The short version:

1. Deploy `ml_api/` to Render (Blueprint reads `ml_api/render.yaml`).
2. Deploy the repo root to Vercel as a **Node** project — this is the API gateway.
   Set env vars from `server/.env.example`.
3. Deploy `client/` to a separate Vercel project — this is the frontend.
   Set `VITE_API_BASE_URL` to the gateway URL.
4. Point `rinkglobal.com` → frontend Vercel project.
   Point `api.rinkglobal.com` → gateway Vercel project (or use a single project
   with rewrites if you prefer one domain).

## Security checklist before going live

- [ ] Rotate the Groq API key (the one in your local `server/.env` should be
      considered compromised since it has been on disk).
- [ ] Confirm `server/.env` and `client/.env*` are not committed (run
      `git ls-files | grep -E '\.env(\.|$)'` — output should be empty).
- [ ] Set Supabase row-level security policies on any tables you add.
- [ ] Confirm `ALLOWED_ORIGINS` includes only your real domains.
- [ ] Verify `https://api.rinkglobal.com/api/health` reports all components healthy.

## License

MIT.
