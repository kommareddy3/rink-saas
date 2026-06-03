# Gateway endpoints

The Express gateway exposes the following public routes. All paths are
relative to `https://api.rinkglobal.com`.

## `GET /`

Liveness probe. No auth required.

```json
{ "service": "RINK Global Services API", "status": "ok" }
```

## `GET /api/health`

Aggregated health for the entire stack. No auth required.

```json
{
  "api": "ok",
  "ml": "ok",
  "groq": "configured",
  "auth": "configured"
}
```

The `ml` field probes the FastAPI service with a 4-second timeout. If the
ML service is sleeping (free-tier Render) it'll show `unreachable (...)`
on the first call.

## `POST /api/ai-assistant`

Calls the Groq chat completions API on the user's behalf. **No auth
required** (gated by the gateway's Groq quota).

**Request**

```json
{ "message": "What is RMSE in time-series forecasting?" }
```

| Field   | Type   | Constraint                     |
| ------- | ------ | ------------------------------ |
| message | string | 1 – 4,000 characters           |

**Response**

```json
{ "response": "RMSE (root mean-squared error) is …" }
```

**Errors**

- `400` — empty or non-string `message`.
- `413` — message > 4,000 chars.
- `503` — `GROQ_API_KEY` not configured on the gateway.
- Any other status — passed through from Groq.

---

## `POST /api/upload` 🔒

Uploads a CSV and auto-trains the model. Requires auth.

**Request** — `multipart/form-data` with a single field:

| Field | Type | Constraint           |
| ----- | ---- | -------------------- |
| file  | file | `.csv`, ≤ 10 MB      |

The uploaded file is **scanned** (non-CSV/binary uploads are rejected) and
**encrypted at rest** by the ML service before storage. See
[Security](/security).

**Response**

```json
{
  "message": "Uploaded and trained successfully.",
  "training": {
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
}
```

**Errors**

- `400` — no file, wrong extension, malformed CSV, or rejected by the
  content scanner (binary/archive/executable/null bytes).
- `401` — auth failure.
- `413` — file > 10 MB.
- `502` — ML service unreachable.

---

## `POST /api/analyze` 🔒

Profiles the uploaded CSV: detects the date column, suggests a value
column, and flags panel/grouped data plus a candidate group/ID column.
Forwarded to the ML service's [`/analyze`](/api/ml-service#post-analyze).

**Request**: no body required.

**Response** (abridged)

```json
{
  "rows": 600,
  "suggested_date_column": "day",
  "suggested_value_column": "temp",
  "suggested_group_column": "city",
  "is_panel_data": true,
  "group_values": ["Detroit", "Austin", "Seattle"],
  "date_min": "2021-01-01",
  "date_max": "2021-07-19",
  "encryption_at_rest": true,
  "warnings": ["…pick one group to forecast a single, clean series."]
}
```

---

## `POST /api/train` 🔒

Re-trains the model on the user's persisted CSV. The body is forwarded
verbatim to the ML service, so all training-scope options are available.

**Request** (optional body — omit everything to train on **all data**)

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

| Field  | Type   | Description                                               |
| ------ | ------ | --------------------------------------------------------- |
| column | string (optional) | Override the auto-detected target column.    |
| feature_columns | string[] (optional) | **Multivariate** — extra numeric columns used as predictors. Invalid entries are dropped. |
| group_column / group_value | string (optional) | Forecast one group from panel data. |
| train_start / train_end | ISO date (optional) | Inclusive training window. |
| exclude_ranges | `[[start, end], …]` (optional) | Date ranges to drop. |

If everything is omitted, the gateway falls back to the last-saved column
or auto-detection and uses the full history.

**Response** — same shape as the `training` block in `/api/upload`, plus
`feature_columns`, `group_column`, `group_value`, `train_start`, and
`train_end`.

---

## `POST /api/predict` 🔒

Generates a multi-step forecast from a list of recent values.

**Request**

```json
{
  "values": [6.30, 6.37, 6.46, 6.22, 6.00, 6.40, 6.21],
  "steps": 10
}
```

| Field  | Type      | Constraint                              |
| ------ | --------- | --------------------------------------- |
| values | number[]  | At least 7 numeric values, oldest first |
| steps  | integer   | 1 – 1825 (default 10)                   |

> For a **multivariate** model (trained with `feature_columns`), `values` is
> ignored — the forecast is seeded from your stored series so the predictor
> history is available. Send any non-empty `values` to satisfy the schema.

**Response**

```json
{
  "predictions": [6.21, 6.20, 6.20, 6.19, 6.19, 6.18, 6.18, 6.17, 6.17, 6.16]
}
```

**Errors**

- `400` — fewer than 7 values, or `steps` out of range.
- `409` — model not yet trained for this user.

---

## `GET /api/data` 🔒

Returns the user's stored time-series, sorted ascending by date when
detected.

**Query parameters** (all forwarded to the ML service)

| Param  | Type    | Default | Description                                |
| ------ | ------- | ------- | ------------------------------------------ |
| limit  | integer | 5000    | Max rows to return (cap: 20000)            |
| column | string  | —       | Override the auto-detected target column.  |
| group_column / group_value | string | — | Filter panel data to one group.    |
| train_start / train_end | ISO date | — | Inclusive date window.                |
| exclude | string | —      | Excluded ranges as `start:end,start:end`.  |

**Response**

```json
{
  "column": "pmms30",
  "available_columns": ["pmms30", "pmms15", "pmms51"],
  "data": [7.33, 7.31, 7.31, 7.31, 7.29, 7.38, …],
  "dates": ["1971-04-02", "1971-04-09", "1971-04-16", …],
  "frequency": "weekly",
  "date_column": "date",
  "group_column": null,
  "group_value": null,
  "days_per_step": 7.0
}
```

If the user has not uploaded a CSV yet, a tiny demo series is returned so
the dashboard can render.

---

## `DELETE /api/user-data` 🔒

Removes **all** of the calling user's data — uploaded dataset and every stored
report — from cloud storage and disk. Triggered on demand from the profile
(**Delete my data**). Sign-out does **not** call this.

**Response**

```json
{ "status": "deleted", "removed": true, "objects_removed": 3 }
```

`removed` is `false` if there was nothing to delete (already-empty user).

---

## `POST /api/reports` 🔒

Stores a generated report in encrypted cloud storage. Multipart body: `file`
(the report, ≤ 25 MB) plus optional `title` and `fmt`. The report is
virus-scanned and encrypted before storage.

**Response**: the stored report's metadata
(`report_id`, `filename`, `content_type`, `fmt`, `size`, `title`, `created_at`).

## `GET /api/reports` 🔒

Lists the caller's stored reports: `{ "reports": [ … ], "count": N }`.

## `GET /api/reports/:id` 🔒

Downloads one decrypted report with its original content type and filename.

## `DELETE /api/reports/:id` 🔒

Deletes a single stored report.

> Reports and datasets are retained for up to **90 days**, then auto-deleted
> by the storage lifecycle rule. See [Cloud storage setup](/CLOUD_STORAGE_SETUP).

---

## Dataset library 🔒

Every upload is added to the user's file library (kept in the bucket) and set
as the **active** dataset that the analysis/forecasting tools read. Users can
keep many files and switch between them.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/upload` | upload a CSV — added to the library and made active (auto-trains) |
| `GET` | `/api/datasets` | list the user's files: `{ datasets[], count, active_file_id }` |
| `POST` | `/api/datasets/:id/activate` | make a stored file the active dataset and re-train |
| `DELETE` | `/api/datasets/:id` | delete one file from the bucket |
| `DELETE` | `/api/datasets` | delete **all** uploaded files |

Each dataset entry includes `file_id`, `filename`, `size`, `rows`,
`created_at`, and `active`.

---

## `POST /api/passkeys/register/begin` 🔒

Generates a WebAuthn registration challenge for the authenticated user.
Returns `{ options, sessionToken }`. Pass `options` to
`@simplewebauthn/browser`'s `startRegistration()`; pass `sessionToken`
back on the finish call.

## `POST /api/passkeys/register/finish` 🔒

Verifies the WebAuthn attestation and stores the credential.

**Request**

```json
{ "sessionToken": "…", "response": <attestation>, "friendlyName": "MacBook Touch ID" }
```

**Response**

```json
{ "status": "registered" }
```

## `POST /api/passkeys/authenticate/begin`

Generates a sign-in challenge. **No auth required.** If `email` is
included in the body, server tailors the allow-list to that user's
credentials; otherwise returns discoverable-credential options.

**Request**

```json
{ "email": "you@example.com" }   // optional
```

**Response**

```json
{ "options": { … WebAuthn opts … }, "sessionToken": "…" }
```

## `POST /api/passkeys/authenticate/finish`

Verifies the assertion. On success, mints a one-time Supabase OTP token
the client can exchange for a session via
`supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })`.

**Response**

```json
{ "email": "you@example.com", "token_hash": "…", "type": "magiclink" }
```

## `GET /api/passkeys` 🔒

Lists the calling user's registered passkeys.

```json
{ "passkeys": [
  { "id": "uuid", "friendly_name": "MacBook Touch ID",
    "created_at": "…", "last_used_at": "…",
    "device_type": "multiDevice", "backed_up": true,
    "transports": ["internal"] }
] }
```

## `DELETE /api/passkeys/:id` 🔒

Removes one passkey. Returns `404` if it's not yours or doesn't exist.

---

## Notation

- 🔒 — requires `Authorization: Bearer <supabase_access_token>` header.
- All authed routes additionally include `X-User-ID` (and optionally
  `X-Gateway-Secret`) in upstream calls to the ML service.
