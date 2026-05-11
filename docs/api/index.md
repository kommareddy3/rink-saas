# API Reference

RINK exposes one public API: the **gateway**, hosted at
`https://api.rinkglobal.com`. The ML service behind it is internal and not
intended for direct use.

## Base URLs

| Environment | URL                              |
| ----------- | -------------------------------- |
| Production  | `https://api.rinkglobal.com`     |
| Local dev   | `http://localhost:5001`          |

## Sections

- **[Authentication](./authentication)** — how to obtain and use Supabase
  access tokens.
- **[Gateway endpoints](./gateway)** — every public endpoint, with
  request/response shapes and error codes.
- **[ML service endpoints](./ml-service)** — internal-only, documented
  for self-hosters.

## Conventions

All requests and responses use **JSON** (except `/api/upload`, which uses
multipart form data).

Every protected endpoint requires:

```
Authorization: Bearer <supabase_access_token>
```

A missing or invalid token returns:

```json
{ "error": "Missing bearer token" }
```

with status `401`.

## Error format

Errors are returned as:

```json
{ "error": "human-readable message" }
```

The HTTP status code carries the full meaning:

| Code | Meaning                                                     |
| ---- | ----------------------------------------------------------- |
| 400  | Bad request — usually a validation or shape problem         |
| 401  | Missing / invalid / expired bearer token                    |
| 403  | CORS origin not allowed                                     |
| 409  | Resource not in the right state (e.g. predict before train) |
| 413  | Upload too large (>10 MB)                                   |
| 500  | Unhandled gateway error                                     |
| 502  | Downstream ML service unreachable                           |
| 503  | Gateway dependency missing (e.g. Groq key not set)          |

## Quick example

```bash
TOKEN="eyJhbGc..."           # from Supabase

# Health probe (no auth)
curl https://api.rinkglobal.com/api/health

# Authed: load the user's series
curl -H "Authorization: Bearer $TOKEN" \
     "https://api.rinkglobal.com/api/data?limit=100"

# Authed: forecast 10 steps from values
curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"values":[6.0,6.1,6.2,6.3,6.4,6.5,6.6],"steps":10}' \
     https://api.rinkglobal.com/api/predict
```
