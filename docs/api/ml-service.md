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
  "gateway_secret_required": true
}
```

### `POST /upload`

Accepts a `.csv` file (multipart) and persists it under
`/var/data/users/<X-User-ID>/uploaded.csv`.

Same constraints as the gateway: ≤ 10 MB, valid CSV.

**Response**

```json
{ "status": "uploaded", "bytes": 12345 }
```

### `POST /train`

Reads the user's persisted CSV, sorts chronologically, builds features,
and fits a `GradientBoostingRegressor`.

**Body** (all fields optional)

```json
{ "column": "pmms30" }
```

If `column` is provided and matches an available numeric column, that
column is used. Otherwise the saved meta column or the auto-detected
column wins.

**Response**

```json
{
  "status": "trained",
  "rows_used": 2866,
  "column": "pmms30",
  "available_columns": ["pmms30", "pmms15", "pmms51"],
  "date_column": "date",
  "frequency": "weekly",
  "days_per_step": 7.0,
  "rmse": 0.0234,
  "mae": 0.0187
}
```

### `POST /predict`

Recursive multi-step forecast.

**Body**

```json
{ "values": [6.30, 6.37, 6.46, 6.22, 6.00, 6.40, 6.21], "steps": 10 }
```

**Response**

```json
{ "predictions": [6.21, 6.20, …] }
```

### `GET /data`

Returns the user's actual series, plus available numeric columns and date
metadata.

**Query**: `limit` (default 500, cap 5000), `column` (optional override).

**Response**: same shape as the gateway's `/api/data`.

If the user has no persisted CSV, a tiny demo series is returned.

### `DELETE /user-data`

Removes the user's directory entirely:

```
shutil.rmtree("/var/data/users/<X-User-ID>")
```

**Response**

```json
{ "status": "deleted", "removed": true }
```

## Storage layout

```
/var/data/
└── users/
    └── <user_uuid>/
        ├── uploaded.csv     # original upload, preserved as-is
        ├── model.joblib     # joblib-pickled GradientBoostingRegressor
        └── meta.joblib      # { column, date_column, frequency, days_per_step }
```

A 1 GB Render persistent disk holds roughly 900 average users worth of
state at ~1.1 MB each. Scale the disk in `ml_api/render.yaml` if needed.

## Environment variables

| Variable            | Required | Description                                                                 |
| ------------------- | -------- | --------------------------------------------------------------------------- |
| `RINK_DATA_DIR`     | No       | Where to store per-user files. Defaults to `<service>/data`. Render uses `/var/data`. |
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
