# Authentication

All ML routes (`/api/upload`, `/api/train`, `/api/predict`, `/api/data`,
`/api/user-data`) require a Supabase **access token** (a short-lived JWT)
in the `Authorization` header.

## Obtaining a token

In the browser, the Supabase JS client manages this automatically. The
helper in `client/src/api.js` attaches it to every request:

```js
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;
```

For programmatic / scripted access, sign in with the JS or REST client:

```js
import { createClient } from "@supabase/supabase-js";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data, error } = await sb.auth.signInWithPassword({
  email: "you@example.com",
  password: "your-password",
});
const token = data.session.access_token;
```

Or via REST:

```bash
curl -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

The JSON response contains `access_token`. Use it directly:

```bash
curl -H "Authorization: Bearer $access_token" \
     https://api.rinkglobal.com/api/data
```

## Token lifetime

Supabase access tokens expire after **1 hour** by default. The Supabase JS
client refreshes them transparently using the longer-lived refresh token.

For scripted usage, you'll need to re-call `signInWithPassword` (or the
refresh token endpoint) when you get a `401`.

## Verifying tokens server-side

The Express gateway validates every token by calling
`supabase.auth.getUser(token)` against your Supabase project URL. If
validation succeeds, the user's UUID becomes available as `req.user.id`
and is forwarded to the ML service as `X-User-ID`.

This is a real network call, but Supabase caches token signatures so the
overhead is small (~10–20 ms).

## Idle timeout (client-side)

The browser app additionally enforces a **4-hour idle timeout** on top of
Supabase's token TTL — see the
[Account guide](/guides/account#idle-timeout). This is a UX feature, not a
server-side guarantee. A scripted client will stay authenticated as long
as Supabase honours the token.

## Failure modes

| Status | Body                                              | Meaning                                                                |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| 401    | `{"error": "Missing bearer token"}`               | No `Authorization` header                                              |
| 401    | `{"error": "Invalid or expired token"}`           | Supabase rejected the token (could be expired)                         |
| 401    | `{"error": "Token verification failed"}`          | Supabase couldn't be reached, or a network error occurred              |
| 503    | `{"error": "Auth service not configured"}`        | The gateway has no `SUPABASE_URL` / `SUPABASE_ANON_KEY` set            |

## CORS

By default the gateway accepts requests from:

- `http://localhost:5173` (Vite dev server)
- `http://localhost:5001` (gateway dev origin)
- `https://rinkglobal.com`
- `https://www.rinkglobal.com`

Override with `ALLOWED_ORIGINS` (comma-separated). A request from an
unlisted origin returns `403 Origin … not allowed by CORS`.
