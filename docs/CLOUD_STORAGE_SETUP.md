# Cloud storage, encryption, virus scanning & retention

This guide covers the file-storage system: user datasets and generated reports
are stored in **Cloudflare R2**, encrypted at rest, virus-scanned before being
stored, and auto-deleted after **90 days** (or on user request).

If R2 is **not** configured, everything transparently falls back to local disk,
so dev and tests keep working with no setup.

---

## 1. Architecture

```
Browser ──► Express gateway (api.rinkglobal.com) ──► FastAPI ML service
                                                         │
                                  ┌──────────────────────┼───────────────────┐
                                  ▼                      ▼                   ▼
                         VirusTotal (scan)        Fernet (encrypt)     Cloudflare R2
```

- **Datasets** (`POST /api/upload`): scanned → encrypted → stored at
  `users/<user_id>/uploaded.csv`.
- **Reports** (`POST /api/reports`): scanned → encrypted → stored at
  `users/<user_id>/reports/<report_id>/blob` with a small plaintext
  `meta.json` sidecar for listing.
- **Delete now** (`DELETE /api/user-data`): wipes the entire
  `users/<user_id>/` prefix (datasets + every report) from R2 and disk.
- **Retention**: an R2 lifecycle rule deletes any object older than 90 days.

All blobs are encrypted with the existing `RINK_ENCRYPTION_KEY` (Fernet /
AES-128) **before** they are handed to R2, so the bucket never sees plaintext.

---

## 2. Create the Cloudflare R2 bucket

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `rink-user-data`).
2. **R2** → **Manage R2 API Tokens** → **Create API token** with
   *Object Read & Write* on that bucket. Copy the **Access Key ID** and
   **Secret Access Key** (shown once).
3. Note your **Account ID** (R2 overview page).

### Lifecycle rule (the 90-day retention)

Bucket → **Settings** → **Object lifecycle rules** → **Add rule**:

- Apply to: **all objects** (prefix `users/`)
- Action: **Delete objects** **90 days** after creation

That single rule enforces the 3-month retention with zero app code. Per-user
"delete now" is handled in-app and is independent of this rule.

---

## 3. Environment variables

Set these on the **ML service** (Render) — that's the only component that talks
to R2 and VirusTotal.

| Variable | Required | Notes |
|---|---|---|
| `R2_ACCOUNT_ID` | for R2 | Cloudflare account id |
| `R2_ACCESS_KEY_ID` | for R2 | R2 API token key id |
| `R2_SECRET_ACCESS_KEY` | for R2 | R2 API token secret |
| `R2_BUCKET` | for R2 | bucket name, e.g. `rink-user-data` |
| `R2_ENDPOINT` | optional | defaults to `https://<account>.r2.cloudflarestorage.com` |
| `RINK_ENCRYPTION_KEY` | recommended | Fernet key — encrypts every blob. Generate once (below). |
| `VIRUSTOTAL_API_KEY` | for scanning | enables AV scanning; if unset, scanning is skipped |
| `VT_MALICIOUS_THRESHOLD` | optional | engines that must flag a file to reject (default `1`) |
| `VT_UPLOAD_UNKNOWN` | optional | `1` to upload never-seen files to VT for live analysis (slower; ≤32 MB) |
| `VT_FAIL_CLOSED` | optional | `1` to reject uploads when VT is unreachable (default: allow) |

Generate a Fernet key:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> Keep `RINK_ENCRYPTION_KEY` stable — rotating it makes previously stored files
> unreadable. If unset, blobs are stored unencrypted (fine for local dev only).

If **none** of the `R2_*` vars are set, storage falls back to local disk at
`RINK_DATA_DIR` (default `ml_api/data/`).

---

## 4. VirusTotal notes

- The scanner is **hash-first**: it SHA-256s the file and looks the hash up, so
  known-clean files add no latency and cost nothing.
- The public API free tier is rate-limited (~4 requests/min) and caps direct
  uploads at 32 MB. For production volume, use a paid VirusTotal key or leave
  `VT_UPLOAD_UNKNOWN=0` (hash-only, which is free and fast).
- Default behaviour is **fail-open** (allow + log) when VT is unreachable, so a
  VT outage never blocks legitimate uploads. Set `VT_FAIL_CLOSED=1` to flip
  that if your compliance posture requires it.

---

## 5. Dependencies

Added to `ml_api/requirements.txt`:

```
boto3==1.35.99     # S3 client for R2
requests==2.32.3   # VirusTotal API calls
```

Run `pip install -r ml_api/requirements.txt` after pulling.

---

## 6. Deployment-size caveat

Report uploads can be up to **25 MB** and contact attachments up to **20 MB**.
If the Express gateway runs on a serverless platform (e.g. Vercel), the
platform's request-body cap (~4.5 MB Hobby / ~10 MB Pro) applies before our
code runs. The ML service on Render has no such cap. For full-size uploads,
keep the upload-handling routes on Render rather than a serverless host.

---

## 7. API summary

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/upload` | upload a CSV — scanned, encrypted, added to the file library, made active |
| `GET` | `/api/datasets` | list the caller's uploaded files (+ which is active) |
| `POST` | `/api/datasets/:id/activate` | switch the active dataset and re-train |
| `DELETE` | `/api/datasets/:id` | delete one uploaded file |
| `DELETE` | `/api/datasets` | delete all uploaded files |
| `POST` | `/api/reports` | store a generated report (multipart `file`, `title`, `fmt`) |
| `GET` | `/api/reports` | list the caller's stored reports (metadata) |
| `GET` | `/api/reports/:id` | download one report (decrypted) |
| `DELETE` | `/api/reports/:id` | delete one report |
| `DELETE` | `/api/user-data` | delete ALL of the caller's data (every file + report) |

Users manage all of this from the **My data** panel in the workspace and in
their Profile.

Check `GET /health` on the ML service — it now reports `storage_backend`
(`r2`/`local`) and `virus_scanning` (true/false).
