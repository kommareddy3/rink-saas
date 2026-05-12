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

- `400` — no file, wrong extension, malformed CSV.
- `401` — auth failure.
- `413` — file > 10 MB.
- `502` — ML service unreachable.

---

## `POST /api/train` 🔒

Re-trains the model on the user's persisted CSV.

**Request** (optional body)

```json
{ "column": "pmms15" }
```

| Field  | Type   | Description                                               |
| ------ | ------ | --------------------------------------------------------- |
| column | string (optional) | Override the auto-detected target column.    |

If `column` is omitted, the gateway falls back to the last-saved column
or auto-detection.

**Response** — same shape as the `training` block in `/api/upload`.

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
| steps  | integer   | 1 – 200 (default 10)                    |

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

**Query parameters**

| Param  | Type    | Default | Description                                |
| ------ | ------- | ------- | ------------------------------------------ |
| limit  | integer | 500     | Max rows to return (cap: 5000)             |
| column | string  | —       | Override the auto-detected target column.  |

**Response**

```json
{
  "column": "pmms30",
  "available_columns": ["pmms30", "pmms15", "pmms51"],
  "data": [7.33, 7.31, 7.31, 7.31, 7.29, 7.38, …],
  "dates": ["1971-04-02", "1971-04-09", "1971-04-16", …],
  "frequency": "weekly",
  "date_column": "date",
  "days_per_step": 7.0
}
```

If the user has not uploaded a CSV yet, a tiny demo series is returned so
the dashboard can render.

---

## `DELETE /api/user-data` 🔒

Removes the calling user's uploaded CSV and trained model. Called
automatically on sign-out (manual or idle).

**Response**

```json
{ "status": "deleted", "removed": true }
```

`removed` is `false` if there was nothing to delete (already-empty user).

---

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
