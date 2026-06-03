"""
Virus / malware scanning for uploaded files.
============================================

Uses the VirusTotal API. The flow is hash-first so clean, already-seen files
cost nothing and add no latency:

  1. Compute the file's SHA-256.
  2. Look the hash up on VirusTotal (GET /files/{hash}).
       - If known and flagged malicious by >= VT_MALICIOUS_THRESHOLD engines
         -> reject.
       - If known and clean -> allow.
  3. If the hash is unknown AND the file is within VT's size limit, optionally
     upload it for analysis (VT_UPLOAD_UNKNOWN=1). Otherwise allow-with-log so
     we never hard-block legitimate first-time uploads on an external service.

Configuration (env vars):
  VIRUSTOTAL_API_KEY     enables scanning. If unset, scan() is a no-op (allows).
  VT_MALICIOUS_THRESHOLD number of engines that must flag a file (default 1)
  VT_UPLOAD_UNKNOWN      "1" to upload unseen files for live analysis (slower)
  VT_FAIL_CLOSED         "1" to reject when VT is unreachable (default: allow)

Raises fastapi.HTTPException(422) when a file is determined malicious.
"""
from __future__ import annotations

import hashlib
import logging
import os
import time

from fastapi import HTTPException

log = logging.getLogger("rink-ml.scanning")

_API_KEY = os.environ.get("VIRUSTOTAL_API_KEY", "").strip()
_THRESHOLD = int(os.environ.get("VT_MALICIOUS_THRESHOLD", "1"))
_UPLOAD_UNKNOWN = os.environ.get("VT_UPLOAD_UNKNOWN", "0").strip() == "1"
_FAIL_CLOSED = os.environ.get("VT_FAIL_CLOSED", "0").strip() == "1"

# VirusTotal's public API accepts direct uploads up to 32 MB.
_VT_UPLOAD_LIMIT = 32 * 1024 * 1024
_BASE = "https://www.virustotal.com/api/v3"

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None


def enabled() -> bool:
    return bool(_API_KEY) and requests is not None


def _headers() -> dict:
    return {"x-apikey": _API_KEY}


def _reject(filename: str, malicious: int) -> None:
    raise HTTPException(
        status_code=422,
        detail=(
            f"“{filename}” was flagged as malicious by {malicious} antivirus "
            f"engine(s) and was not stored."
        ),
    )


def _unreachable(filename: str, exc: Exception) -> None:
    if _FAIL_CLOSED:
        raise HTTPException(
            status_code=503,
            detail="Virus scanner is unavailable; upload rejected. Try again later.",
        )
    log.warning("[scan] VT unreachable for %s, allowing (fail-open): %s", filename, exc)


def _stats_malicious(attributes: dict) -> int:
    stats = (attributes or {}).get("last_analysis_stats", {}) or {}
    return int(stats.get("malicious", 0)) + int(stats.get("suspicious", 0))


def scan(data: bytes, filename: str = "upload") -> None:
    """Scan raw bytes. No-op when scanning is disabled. Raises on malicious."""
    if not enabled():
        return

    sha256 = hashlib.sha256(data).hexdigest()

    # 1. Hash lookup — free and instant for known files.
    try:
        resp = requests.get(f"{_BASE}/files/{sha256}", headers=_headers(), timeout=15)
    except Exception as exc:
        return _unreachable(filename, exc)

    if resp.status_code == 200:
        attrs = (resp.json() or {}).get("data", {}).get("attributes", {})
        malicious = _stats_malicious(attrs)
        if malicious >= _THRESHOLD:
            log.warning("[scan] %s flagged by %d engines (sha=%s)", filename, malicious, sha256)
            _reject(filename, malicious)
        log.info("[scan] %s clean via hash lookup", filename)
        return

    if resp.status_code != 404:
        # Rate-limited (429) or other transient error.
        return _unreachable(filename, RuntimeError(f"VT status {resp.status_code}"))

    # 2. Unknown file (404). Optionally submit for live analysis.
    if not _UPLOAD_UNKNOWN or len(data) > _VT_UPLOAD_LIMIT:
        log.info("[scan] %s unknown to VT; allowing without upload", filename)
        return

    try:
        up = requests.post(
            f"{_BASE}/files",
            headers=_headers(),
            files={"file": (filename, data)},
            timeout=60,
        )
        if up.status_code not in (200, 201):
            return _unreachable(filename, RuntimeError(f"VT upload status {up.status_code}"))
        analysis_id = (up.json() or {}).get("data", {}).get("id")
        if not analysis_id:
            return

        # Poll the analysis a few times (bounded) for a verdict.
        for _ in range(6):
            time.sleep(3)
            an = requests.get(f"{_BASE}/analyses/{analysis_id}", headers=_headers(), timeout=15)
            if an.status_code != 200:
                continue
            adata = (an.json() or {}).get("data", {}).get("attributes", {})
            if adata.get("status") == "completed":
                stats = adata.get("stats", {}) or {}
                malicious = int(stats.get("malicious", 0)) + int(stats.get("suspicious", 0))
                if malicious >= _THRESHOLD:
                    _reject(filename, malicious)
                log.info("[scan] %s clean via live analysis", filename)
                return
        log.info("[scan] %s analysis pending; allowing (verdict not ready)", filename)
    except HTTPException:
        raise
    except Exception as exc:
        return _unreachable(filename, exc)
