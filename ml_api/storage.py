"""
Blob storage abstraction for the RINK ML service.
======================================================

Stores user datasets and generated reports in Cloudflare R2 (an S3-compatible
object store) when configured, and transparently falls back to the local
filesystem when it is not (handy for local dev and tests).

Configuration (env vars) — all required for R2 to activate:
  R2_ACCOUNT_ID          Cloudflare account id
  R2_ACCESS_KEY_ID       R2 S3 API access key id
  R2_SECRET_ACCESS_KEY   R2 S3 API secret
  R2_BUCKET              bucket name
Optional:
  R2_ENDPOINT            override the derived endpoint URL
  RINK_DATA_DIR          local fallback root (defaults to ./data)

Retention: object expiry (the "store for 3 months" rule) is enforced by an R2
*lifecycle rule* configured in the Cloudflare dashboard (see docs). This module
only writes/reads/deletes; it does not implement a scheduler. Per-user "delete
now" is handled by delete_prefix().

Encryption: callers are expected to encrypt/decrypt payloads (the ML service
uses Fernet) before handing bytes to this layer, so blobs are encrypted at rest
regardless of backend.
"""
from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path
from typing import List, Optional

log = logging.getLogger("rink-ml.storage")

_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "").strip()
_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY_ID", "").strip()
_SECRET_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "").strip()
_BUCKET = os.environ.get("R2_BUCKET", "").strip()
_ENDPOINT = os.environ.get("R2_ENDPOINT", "").strip() or (
    f"https://{_ACCOUNT_ID}.r2.cloudflarestorage.com" if _ACCOUNT_ID else ""
)

_LOCAL_ROOT = Path(os.environ.get("RINK_DATA_DIR", Path(__file__).parent / "data"))

_R2_READY = bool(_ACCOUNT_ID and _ACCESS_KEY and _SECRET_KEY and _BUCKET and _ENDPOINT)

_s3 = None
if _R2_READY:
    try:
        import boto3  # type: ignore
        from botocore.config import Config  # type: ignore

        _s3 = boto3.client(
            "s3",
            endpoint_url=_ENDPOINT,
            aws_access_key_id=_ACCESS_KEY,
            aws_secret_access_key=_SECRET_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )
        log.info("R2 storage active (bucket=%s)", _BUCKET)
    except Exception as exc:  # pragma: no cover - import/credential failure
        log.warning("R2 init failed, falling back to local disk: %s", exc)
        _s3 = None
        _R2_READY = False
else:
    log.info("R2 not configured — using local disk at %s", _LOCAL_ROOT)


def backend_name() -> str:
    return "r2" if (_R2_READY and _s3 is not None) else "local"


def is_remote() -> bool:
    return backend_name() == "r2"


# ---------------------------------------------------------------------------
# Local-disk helpers
# ---------------------------------------------------------------------------

def _local_path(key: str) -> Path:
    # Keys are POSIX-style ("users/<id>/uploaded.csv"); map onto the FS root.
    return _LOCAL_ROOT / key


# ---------------------------------------------------------------------------
# Public API — key/value style over object storage
# ---------------------------------------------------------------------------

def put(key: str, data: bytes, content_type: str = "application/octet-stream") -> None:
    if is_remote():
        _s3.put_object(Bucket=_BUCKET, Key=key, Body=data, ContentType=content_type)
        return
    p = _local_path(key)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)


def get(key: str) -> Optional[bytes]:
    """Return the object bytes, or None if it does not exist."""
    if is_remote():
        try:
            resp = _s3.get_object(Bucket=_BUCKET, Key=key)
            return resp["Body"].read()
        except Exception:
            return None
    p = _local_path(key)
    if not p.exists():
        return None
    return p.read_bytes()


def exists(key: str) -> bool:
    if is_remote():
        try:
            _s3.head_object(Bucket=_BUCKET, Key=key)
            return True
        except Exception:
            return False
    return _local_path(key).exists()


def delete(key: str) -> bool:
    if is_remote():
        try:
            _s3.delete_object(Bucket=_BUCKET, Key=key)
            return True
        except Exception:
            return False
    p = _local_path(key)
    if p.exists():
        try:
            p.unlink()
            return True
        except Exception:
            return False
    return False


def list_prefix(prefix: str) -> List[str]:
    """Return every key under the given prefix."""
    keys: List[str] = []
    if is_remote():
        token = None
        while True:
            kwargs = {"Bucket": _BUCKET, "Prefix": prefix}
            if token:
                kwargs["ContinuationToken"] = token
            resp = _s3.list_objects_v2(**kwargs)
            for obj in resp.get("Contents", []):
                keys.append(obj["Key"])
            if resp.get("IsTruncated"):
                token = resp.get("NextContinuationToken")
            else:
                break
        return keys
    base = _local_path(prefix)
    root = base if base.is_dir() else base.parent
    if not root.exists():
        return []
    for p in root.rglob("*"):
        if p.is_file():
            rel = p.relative_to(_LOCAL_ROOT).as_posix()
            if rel.startswith(prefix):
                keys.append(rel)
    return keys


def delete_prefix(prefix: str) -> int:
    """Delete every object under prefix. Returns the count removed."""
    keys = list_prefix(prefix)
    removed = 0
    if is_remote():
        # S3 delete supports up to 1000 keys per call.
        for i in range(0, len(keys), 1000):
            batch = [{"Key": k} for k in keys[i : i + 1000]]
            if not batch:
                continue
            _s3.delete_objects(Bucket=_BUCKET, Delete={"Objects": batch})
            removed += len(batch)
        return removed
    for k in keys:
        if delete(k):
            removed += 1
    # Clean up now-empty local dirs.
    base = _local_path(prefix)
    target = base if base.is_dir() else base.parent
    if target.exists() and target.is_dir():
        shutil.rmtree(target, ignore_errors=True)
    return removed
