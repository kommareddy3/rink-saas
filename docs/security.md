# Security & data protection

Your data is yours. RINK is built so that the files you upload are
**encrypted at rest, encrypted in transit, isolated to your account, and
deleted automatically when you sign out.** This page explains exactly how
that works, in plain language, so you can share data with confidence.

> **The short version:** every CSV you upload is encrypted *before* it
> touches our disk, can only be read back into memory by the service that
> serves your own forecasts, travels only over HTTPS, lives in a folder
> keyed to your user ID that no other user can reach, and is wiped when
> your session ends.

## Encryption at rest

When you upload a file, RINK encrypts the raw bytes **before they are
written to disk**. The plaintext CSV never lands on the server's storage —
only the encrypted form does.

| Property | Detail |
| -------- | ------ |
| Scheme | [Fernet](https://cryptography.io/en/latest/fernet/) — **AES-128 in CBC mode** for confidentiality, with an **HMAC-SHA256** authentication tag for integrity |
| Library | The audited [`cryptography`](https://pypi.org/project/cryptography/) package (pinned in `ml_api/requirements.txt`) |
| When | At upload time, in memory, before the first disk write |
| Key location | A secret key held only in the ML service's environment (`RINK_ENCRYPTION_KEY`) — never stored alongside the data, never in the database, never in the repo |
| Decryption | Only transiently, in RAM, when you request a forecast or chart of your own data |

Because the file is sealed with an HMAC tag, any tampering with the
stored bytes is detected on read — a modified file will fail to decrypt
rather than silently returning corrupted data.

### What the stored file actually looks like

If someone pulled the raw file off disk, they would see an opaque Fernet
token, not your data:

```
gAAAAABl9c1k_2x...  ← ciphertext + HMAC, undecryptable without the key
```

…instead of:

```
date,value,region
2020-01-01,100.4,north      ← this never hits the disk in plaintext
```

### Key management

The encryption key is a single high-entropy secret set as an environment
variable on the ML service. It is generated once with:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Operators store it only in the platform's encrypted secret store (Render
environment variables), **not** in source control, the database, or any
file that ships with the app. Rotating the key is supported; files written
under an old key continue to read correctly during a migration window.

> **Self-hosting?** Set `RINK_ENCRYPTION_KEY` in your ML service
> environment to turn encryption on. If it is unset, files are stored as
> plaintext — fine for a local dev sandbox, but **always set a key in
> production.** The `GET /health` endpoint reports `encryption_at_rest:
> true/false` so you can confirm it's active.

## Encryption in transit

Every hop is HTTPS/TLS:

- **Browser → Gateway** — TLS, with your Supabase JWT in the
  `Authorization` header.
- **Gateway → ML service** — TLS, with your user ID forwarded in
  `X-User-ID` and an optional shared `X-Gateway-Secret`.

Your CSV is never transmitted or stored in clear text at any point in the
pipeline.

## Upload scanning

RINK only accepts plain-text CSVs, so every upload is scanned **before it
is stored**. We reject anything that isn't a real CSV:

- Executables and libraries (Windows PE/`MZ`, Linux `ELF`, Java/Mach-O).
- Archives and compressed files (ZIP/XLSX/DOCX, RAR, gzip).
- Documents and images (PDF, PNG, JPEG, BMP).
- Files containing binary/null bytes or that aren't decodable as text.

Anything matching these signatures is rejected with a clear error and is
never written to disk. This closes the obvious holes for a parse-only
pipeline. (It is a signature/format guard, not a full antivirus engine —
see the ClamAV note in the deployment guide if you need AV scanning on a
self-hosted deployment.)

## Per-user isolation

Each user's data is stored in a directory keyed to their Supabase user
UUID:

```
/var/data/users/<your_uuid>/
├── uploaded.csv     # encrypted at rest
├── model.joblib     # your trained model
└── meta.joblib      # column / date / group / cadence metadata
```

Every data-touching request must carry a valid `X-User-ID`, and the
service scopes **all** file paths to that ID. There is no endpoint that
returns another user's files, and the ID format is strictly validated
(`^[A-Za-z0-9_-]{8,128}$`) to prevent path traversal.

## Automatic deletion

Your data does not linger:

- **On sign-out** (manual or via the **4-hour idle timeout**), the gateway
  calls `DELETE /api/user-data` and the ML service removes your entire
  directory with `rmtree` — CSV, model, and metadata.
- **On re-upload**, your previous file and model are replaced.

So in normal use, your data exists on the server only for the duration of
your active session.

## Authentication

- **Sign-in** is handled by [Supabase](https://supabase.com), which issues
  a short-lived JWT (default 1-hour TTL) plus a refresh token.
- **Every** API call is verified server-side with
  `supabase.auth.getUser(token)` — an invalid or expired token is rejected
  with `401`.
- **Passkeys (WebAuthn)** and **SSO** (Google, GitHub, Microsoft,
  LinkedIn) are supported for phishing-resistant, password-optional
  sign-in. See [Accounts & sign-in](/guides/account).
- An optional **gateway secret** (`X-Gateway-Secret`) locks the ML service
  so it only answers calls coming through the official gateway.

## What RINK does *not* do with your data

- We do **not** sell or share your uploaded data.
- We do **not** train a shared/global model on your data — every model is
  fit only on *your* dataset and stored only under *your* user ID.
- We do **not** keep your file after you sign out.
- The AI assistant is scoped to forecasting help and is **not** sent your
  uploaded dataset.

## Where your data lives (subprocessors)

| Component | Provider | What it holds |
| --------- | -------- | ------------- |
| Forecasting + storage | Render | Your encrypted CSV, model, and metadata (transient, per-session) |
| Gateway | Vercel | Nothing persistent — files are streamed through in memory only |
| Authentication | Supabase | Your account record (email, auth identifiers) — **not** your uploaded files |
| AI assistant | Groq | Only the questions you type into the assistant — **not** your dataset |

## Reporting a vulnerability

Found a security issue? Please report it privately to
[admin@rinkglobal.com](mailto:admin@rinkglobal.com) (or via
[rinkglobal.com/contact](https://rinkglobal.com/contact)) rather than
opening a public issue. We aim to acknowledge reports quickly and will
keep you updated on the fix.

## Related reading

- [Uploading data](/guides/uploading) — file requirements and what
  happens after upload.
- [Architecture](/architecture) — the full request/data lifecycle.
- [ML service endpoints](/api/ml-service) — the `encryption_at_rest` and
  `encrypted` flags in the API.
- [FAQ](/faq#data-security-privacy) — quick answers about data security.
