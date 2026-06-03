# Security & data protection

Your data is yours. RINK is built so that the files you upload are
**virus-scanned before storage, encrypted at rest, encrypted in transit,
isolated to your account, retained for at most 90 days, and deletable on
demand.** This page explains exactly how that works, in plain language, so
you can share data with confidence.

> **The short version:** every file you upload is scanned for malware, then
> encrypted *before* it reaches storage, can only be read back into memory by
> the service that serves your own forecasts, travels only over HTTPS, lives
> under a key namespace scoped to your user ID that no other user can reach,
> is automatically deleted after 90 days, and can be wiped instantly whenever
> you ask.

## Encryption at rest

When you upload a file, RINK encrypts the raw bytes **before they reach
storage**. The plaintext CSV is never persisted — only the encrypted form is,
whether storage is cloud object storage (Cloudflare R2) or a local disk
fallback. The storage provider never sees your plaintext.

| Property | Detail |
| -------- | ------ |
| Scheme | [Fernet](https://cryptography.io/en/latest/fernet/) — **AES-128 in CBC mode** for confidentiality, with an **HMAC-SHA256** authentication tag for integrity |
| Library | The audited [`cryptography`](https://pypi.org/project/cryptography/) package (pinned in `ml_api/requirements.txt`) |
| When | At upload time, in memory, before the bytes are written to storage |
| Where | Cloudflare R2 (object storage) when configured, else local disk — encrypted either way |
| Key location | A secret key held only in the ML service's environment (`RINK_ENCRYPTION_KEY`) — never stored alongside the data, never in the database, never in the repo, never in the storage bucket |
| Decryption | Only transiently, in RAM, when you request a forecast, chart, or report download of your own data |

This applies to **both** the datasets you upload **and** the reports you
generate — every blob is encrypted with the same scheme before it is stored.

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

## Virus & upload scanning

Every upload passes **two checks before it is stored**:

1. **Format/signature guard.** Datasets must be plain-text CSVs, so we reject
   anything that isn't: executables and libraries (Windows PE/`MZ`, Linux
   `ELF`, Java/Mach-O), archives (ZIP/XLSX/DOCX, RAR, gzip), documents and
   images (PDF, PNG, JPEG, BMP), and files containing binary/null bytes or
   that aren't decodable as text.

2. **Antivirus scan ([VirusTotal](https://www.virustotal.com)).** The file's
   SHA-256 is computed and looked up against VirusTotal's multi-engine
   database. Known-clean files pass instantly at no cost; files flagged as
   malicious by one or more engines are **rejected with a 422 and never
   stored**. (Optionally, never-before-seen files can be uploaded to
   VirusTotal for live analysis.)

Both checks run before encryption and before the file reaches storage. Stored
reports are scanned the same way. If the antivirus service is temporarily
unreachable, the default is fail-open (allow + log) so a scanner outage can't
block legitimate work; operators can switch this to fail-closed
(`VT_FAIL_CLOSED=1`). Scanning activates when a `VIRUSTOTAL_API_KEY` is set —
`GET /health` reports `virus_scanning: true/false`.

## Per-user isolation

Each user's data is stored under a key namespace scoped to their Supabase
user UUID:

```
users/<your_uuid>/
├── uploaded.csv            # your active dataset — encrypted at rest
├── datasets/               # your uploaded file library (keep many; pick one active)
│   └── <file_id>/          # each file — encrypted at rest
└── reports/
    └── <report_id>/        # each saved report — encrypted at rest
```

(Trained models and metadata are kept as a regenerable working cache.) Every
data-touching request must carry a valid `X-User-ID`, and the service scopes
**all** keys to that ID. There is no endpoint that returns another user's
files, and the ID format is strictly validated
(`^[A-Za-z0-9_-]{8,128}$`) to prevent traversal.

## Retention & deletion

Your data is kept only as long as it's useful, then removed automatically:

- **90-day retention.** Datasets and reports are retained for up to **3
  months**, then deleted automatically by a storage **lifecycle rule**. This
  lets you return to your work and re-download past reports across sessions,
  without keeping anything indefinitely.
- **Delete on request.** From the workspace or your profile you can delete
  **any single uploaded file** (`DELETE /api/datasets/:id`), **all files**
  (`DELETE /api/datasets`), **any single report** (`DELETE /api/reports/:id`),
  or **everything at once** (`DELETE /api/user-data`, which removes your entire
  `users/<id>/` namespace from cloud storage and disk).
- **On re-upload**, your previous dataset and model are replaced.

> Sign-out no longer wipes your data — retention and on-demand deletion give
> you control while keeping your datasets and reports available when you
> return.

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
- We do **not** keep your files longer than 90 days, and you can delete them
  sooner at any time.
- The AI assistant is scoped to RINK and forecasting help and is **not** sent
  your uploaded dataset.

## Where your data lives (subprocessors)

| Component | Provider | What it holds |
| --------- | -------- | ------------- |
| File & report storage | Cloudflare R2 | Your **encrypted** datasets and reports (≤ 90-day retention). Cloudflare never sees plaintext |
| Forecasting / ML | Render | Decrypts your data in memory to train and forecast; holds a regenerable model cache |
| Gateway | Vercel | Nothing persistent — files are streamed through in memory only |
| Virus scanning | VirusTotal | A SHA-256 hash, and (only if enabled for unseen files) the file itself for analysis |
| Authentication | Supabase | Your account record (email, auth identifiers) — **not** your uploaded files |
| AI assistant | Groq | Only the questions you type into the assistant — **not** your dataset |

> Operator setup for R2, encryption, scanning, and the 90-day lifecycle rule
> is documented in [Cloud storage setup](/CLOUD_STORAGE_SETUP).

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
