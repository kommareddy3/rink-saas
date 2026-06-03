# ML service endpoints

The FastAPI ML service is **internal**. It runs at
`https://rink-ml.onrender.com` (or your private URL) and is intended to be
called only by the Express gateway.

This page documents it for self-hosters and gateway implementers; if
you're a regular API consumer, use the [gateway endpoints](./gateway)
instead.

## Required headers

Every data-touching endpoint requires:

| Header               | Required        | Notes                                                   |
| -------------------- | --------------- | ------------------------------------------------------- |
| `X-User-ID`          | Yes             | The Supabase UUID. Validates against `^[A-Za-z0-9_-]{8,128}$`. |
| `X-Gateway-Secret`   | Iff `GATEWAY_SECRET` is set | Shared secret between Express and FastAPI.                  |

Missing or invalid headers return `400` (bad user ID) or `401` (bad
gateway secret).

## Endpoints

### `GET /health`

Liveness probe. **No headers required.**

```json
{
  "status": "ok",
  "users_dir": "/var/data/users",
  "user_count": 7,
  "gateway_secret_required": true,
  "encryption_at_rest": true,
  "storage_backend": "r2",
  "virus_scanning": true
}
```

`encryption_at_rest` reflects whether `RINK_ENCRYPTION_KEY` is set and valid.
`storage_backend` is `"r2"` when Cloudflare R2 is configured, else `"local"`.
`virus_scanning` is `true` when a `VIRUSTOTAL_API_KEY` is set. See
[Security](/security#encryption-at-rest).

### `POST /upload`

Accepts a `.csv` file (multipart), runs a **format guard** and a
**VirusTotal scan**, **encrypts it**, and persists the ciphertext under
`users/<X-User-ID>/datasets/<file_id>/` in object storage (R2 or local
fallback), and sets it as the **active** dataset (`uploaded.csv`) that the
analysis/forecast pipeline reads.

Same constraints as the gateway: ≤ 10 MB, valid CSV. Uploads matching a
binary/archive/executable signature or containing null bytes are rejected
with `400`; files flagged malicious by VirusTotal are rejected with `422` —
all before any write. See [virus & upload scanning](/security#virus-upload-scanning).

**Response**

```json
{ "status": "uploaded", "bytes": 12345, "encrypted": true, "scanned": true, "storage": "r2" }
```

`encrypted` is `true` when the file was sealed with the at-rest key. The
plaintext CSV is never written to storage.

### `POST /reports`

Stores a generated report. Accepts a multipart `file` plus optional `title`
and `fmt` fields. The blob is scanned, encrypted, and stored under
`users/<X-User-ID>/reports/<report_id>/`, with a small plaintext `meta.json`
sidecar. ≤ 25 MB.

**Response**

```json
{ "status": "stored", "report_id": "a1b2…", "filename": "report.html",
  "content_type": "text/html", "fmt": "html", "size": 20480,
  "title": "Churn analysis", "created_at": "2026-06-01T12:00:00Z" }
```

### `GET /reports`

Lists the caller's stored reports (metadata only):
`{ "reports": [ … ], "count": N }`.

### `GET /reports/{report_id}`

Streams a single decrypted report back with its original `Content-Type` and a
`Content-Disposition` attachment filename.

### `DELETE /reports/{report_id}`

Deletes a single stored report.

### `GET /datasets`

Lists the user's uploaded file library:

```json
{ "datasets": [ { "file_id": "…", "filename": "sales.csv", "size": 20480,
  "rows": 600, "content_type": "text/csv", "created_at": "…", "active": true } ],
  "count": 1, "active_file_id": "…" }
```

### `POST /datasets/{file_id}/activate`

Copies the chosen file's bytes into the active dataset slot (`uploaded.csv`)
and clears the stale model so the next train runs on the new data. The gateway
re-trains automatically.

### `DELETE /datasets/{file_id}`

Deletes a single file from the library. If it was active, the active dataset
and trained model are cleared.

### `DELETE /datasets`

Deletes **all** of the user's uploaded files (and the active dataset + model).

### `POST /analyze`

Profiles the uploaded CSV so a client can confirm the schema before
training. Detects the date column, numeric value candidates, and — for
**panel/grouped data** (e.g. "temperature per city per day") — a
grouping/ID column.

**Body**: none required.

**Response**

```json
{
  "rows": 600,
  "columns": [
    {
      "name": "city", "dtype": "categorical", "unique_count": 3,
      "null_count": 0, "sample_values": ["Detroit", "Austin", "Seattle"],
      "is_date": false, "is_numeric": false, "is_id_candidate": true
    }
  ],
  "suggested_date_column": "day",
  "suggested_value_column": "temp",
  "suggested_group_column": "city",
  "is_panel_data": true,
  "group_values": ["Detroit", "Austin", "Seattle"],
  "date_min": "2021-01-01",
  "date_max": "2021-07-19",
  "encryption_at_rest": true,
  "warnings": ["Multiple rows share the same date — this looks like panel data grouped by 'city'. Pick one group to forecast a single, clean series."]
}
```

Panel data is detected when dates repeat **and** a low-cardinality
categorical column makes each `(date, group)` pair unique. See
[Uploading → panel data](/guides/uploading#panel-grouped-data).

### `POST /train`

Reads the user's persisted CSV (decrypting in memory), sorts
chronologically, optionally filters to a single group and/or date window,
builds features, and fits a `GradientBoostingRegressor`.

**Body** — all fields optional. When omitted, **all data is used.**

```json
{
  "column": "revenue",
  "feature_columns": ["ad_spend", "visits"],
  "group_column": "city",
  "group_value": "Austin",
  "train_start": "2021-02-01",
  "train_end": "2021-06-30",
  "exclude_ranges": [["2021-03-15", "2021-03-31"]]
}
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `column` | string | Override the auto-detected target column. |
| `feature_columns` | string[] | **Multivariate**: extra numeric columns used as exogenous predictors. Invalid entries (the target itself, non-numeric, or missing columns) are dropped. Omit for a univariate model. |
| `group_column` / `group_value` | string | Forecast a single series from panel data by filtering to one group. The group column is never mistaken for the target. |
| `train_start` / `train_end` | ISO date | Inclusive training window. Either may be omitted. |
| `exclude_ranges` | `[[start, end], …]` | Date ranges to drop from training (e.g. an outage). |

**Response**

```json
{
  "status": "trained",
  "rows_used": 120,
  "column": "revenue",
  "feature_columns": ["ad_spend", "visits"],
  "available_columns": ["revenue", "ad_spend", "visits"],
  "date_column": "day",
  "group_column": "city",
  "group_value": "Austin",
  "frequency": "daily",
  "days_per_step": 1.0,
  "train_start": "2021-02-01",
  "train_end": "2021-06-30",
  "rmse": 1.42,
  "mae": 1.08
}
```

`train_start` / `train_end` echo the **actual** first/last dates used
after filtering. `feature_columns` echoes the predictors actually applied.

#### Multivariate forecasting

When `feature_columns` is supplied, the target is modelled from its own
lags **and** the *lagged* values of each predictor (lag ≥ 1, so there is no
look-ahead leakage). To make recursive multi-step forecasting possible, RINK
also fits a small component model per predictor, so every covariate can be
advanced one step at a time alongside the target. Because of this, a
multivariate `/predict` forecasts from the user's **stored series** rather
than client-supplied `values` (see below).

### `POST /predict`

Recursive multi-step forecast.

**Body**

```json
{ "values": [6.30, 6.37, 6.46, 6.22, 6.00, 6.40, 6.21], "steps": 10 }
```

`steps` is `1 – 1825` (≈ five years of daily steps; a generous abuse
guard, not a hard 30-day limit). `values` needs at least 7 numeric
points, oldest first.

For a **multivariate** model (trained with `feature_columns`), `values` is
ignored — the forecast is seeded from the user's stored series (group-filtered
to match training) so the required covariate history is available. The
request body is otherwise identical.

**Response**

```json
{ "predictions": [6.21, 6.20, …] }
```

### `GET /data`

Returns the user's actual series, plus available numeric columns and date
metadata. Supports the same group/window/exclude filters as `/train` so
the chart matches the trained scope.

**Query**

| Param | Default | Description |
| ----- | ------- | ----------- |
| `limit` | 5000 | Max rows to return (cap: 20000). |
| `column` | — | Override the auto-detected target column. |
| `group_column` / `group_value` | — | Filter panel data to one group. |
| `train_start` / `train_end` | — | Inclusive ISO date window. |
| `exclude` | — | Excluded ranges as `start:end,start:end` (e.g. `2021-03-15:2021-03-31`). |

**Response**: same shape as the gateway's `/api/data` (now also echoes
`group_column` and `group_value`).

If the user has no persisted CSV, a tiny demo series is returned.

### `DELETE /user-data`

Removes the user's entire namespace — dataset **and** every stored report —
from object storage (R2) and the local working cache.

**Response**

```json
{ "status": "deleted", "removed": true, "objects_removed": 3 }
```

## Storage layout

Object-storage keys (Cloudflare R2 when configured, else the equivalent local
path under `RINK_DATA_DIR`):

```
users/<user_uuid>/
├── uploaded.csv              # ACTIVE dataset the pipeline reads — encrypted
├── active.json               # { file_id } — which library file is active
├── datasets/                 # the user's uploaded file library
│   └── <file_id>/
│       ├── blob              # the uploaded CSV — encrypted at rest
│       └── meta.json         # { file_id, filename, size, rows, content_type, created_at }
└── reports/
    └── <report_id>/
        ├── blob              # report file — encrypted at rest
        └── meta.json         # { report_id, filename, content_type, fmt, size, title, created_at }

# Regenerable working cache (local disk):
model.joblib   # joblib-pickled GradientBoostingRegressor (target)
meta.joblib    # { column, feature_columns, exog_models, date_column, group_column, group_value, frequency, days_per_step }
```

Retention: an R2 lifecycle rule deletes objects 90 days after creation. See
[Cloud storage setup](/CLOUD_STORAGE_SETUP).

When `RINK_ENCRYPTION_KEY` is set, `uploaded.csv` holds a Fernet
ciphertext token, not plaintext — see
[Security → encryption at rest](/security#encryption-at-rest). Files
written before a key was set are still readable (the loader falls back to
plaintext when a payload isn't a valid token), so enabling encryption is
non-destructive.

A 1 GB Render persistent disk holds roughly 900 average users worth of
state at ~1.1 MB each. Scale the disk in `ml_api/render.yaml` if needed.

## Environment variables

| Variable            | Required | Description                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------------- |
| `RINK_DATA_DIR`     | No       | Where to store per-user files. Defaults to `<service>/data`. Render uses `/var/data`. |
| `RINK_ENCRYPTION_KEY` | Recommended (prod) | Fernet key for encryption at rest. Generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`. If unset, files are stored as plaintext. |
| `ALLOWED_ORIGINS`   | No       | Comma-separated CORS origins. Defaults to localhost dev origins.            |
| `GATEWAY_SECRET`    | No       | If set, the service rejects requests missing the `X-Gateway-Secret` header. |
| `PYTHON_VERSION`    | No       | Pinned to `3.11.9` via `runtime.txt` and `render.yaml` for sklearn wheels.  |

## Operational notes

- Single Gunicorn worker on Starter plan (512 MB RAM); two workers on
  Standard.
- Cold start (Starter) is ~6 seconds.
- Persistent disk survives redeploys, scale changes, and platform
  maintenance.
- Free tier (no disk) wipes data on every spin-down — fine for demos, not
  for production.
