"""
RINK Global Services - ML Forecasting Service
==============================================

FastAPI service that exposes time-series training and recursive
multi-step forecasting endpoints.

Per-user storage:
  All persisted state (uploaded CSV, trained model, meta) lives under
  ``$RINK_DATA_DIR/users/<user_id>/``. The user's identifier is supplied
  by the gateway via the ``X-User-ID`` request header, which carries the
  Supabase user UUID. Direct callers (without the header) are rejected
  for any data-touching route.

Endpoints:
  GET    /health      Liveness probe
  POST   /upload      Accept a CSV file (multipart) and persist it
  POST   /train       Train the model on the persisted CSV
  POST   /predict     Recursively forecast `steps` future values from `values`
  GET    /data        Return the most recent N values (chronologically sorted)
  DELETE /user-data   Remove all files for the calling user
"""

from __future__ import annotations

import io
import logging
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from scipy import stats as scipy_stats
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import (
    GradientBoostingRegressor,
    IsolationForest,
    RandomForestClassifier,
)
from sklearn.metrics import (
    accuracy_score,
    mean_absolute_error,
    mean_squared_error,
    roc_auc_score,
    silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("rink-ml")

DATA_DIR = Path(os.environ.get("RINK_DATA_DIR", Path(__file__).parent / "data"))
USERS_DIR = DATA_DIR / "users"
USERS_DIR.mkdir(parents=True, exist_ok=True)

PREFERRED_VALUE_COLUMNS = [
    "value", "y", "target", "close", "price", "pmms30",
]
DATE_COLUMN_CANDIDATES = [
    "date", "Date", "DATE",
    "timestamp", "Timestamp", "TIMESTAMP",
    "time", "Time", "TIME",
    "datetime", "DateTime", "DATETIME",
    "ds", "DS",
    "period", "Period", "PERIOD",
]

LAGS = [1, 2, 3, 5, 7]
ROLLING_WINDOWS = [3, 7]
MIN_TRAIN_ROWS = 30
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # must match Express + client limits

# Accepts UUID-ish identifiers (Supabase user IDs are UUIDv4) — and any other
# alphanumeric/dash/underscore sequence. Anything else is rejected.
USER_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,128}$")

ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5001,http://localhost:5173",
    ).split(",")
    if o.strip()
]

# Optional shared secret between Express ↔ FastAPI. When set, every protected
# request must carry this value in the ``X-Gateway-Secret`` header. Leave
# unset for local dev; set in Render env vars in production.
GATEWAY_SECRET = os.environ.get("GATEWAY_SECRET", "").strip()

# ---------------------------------------------------------------------------
# Encryption at rest (Fernet / AES-128-CBC + HMAC)
# ---------------------------------------------------------------------------
# Uploaded CSVs are encrypted before they touch the disk and decrypted only
# in memory when needed. Generate a key once with:
#   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# and set it as RINK_ENCRYPTION_KEY in the ML service env. If unset, files are
# stored as plaintext (fine for local dev; set it in production).
try:
    from cryptography.fernet import Fernet, InvalidToken  # noqa: E402

    _ENC_KEY = os.environ.get("RINK_ENCRYPTION_KEY", "").strip()
    _fernet = Fernet(_ENC_KEY.encode()) if _ENC_KEY else None
except Exception as exc:  # pragma: no cover - import/key failure
    logging.getLogger("rink-ml").warning("Encryption disabled: %s", exc)
    _fernet = None

    class InvalidToken(Exception):  # type: ignore
        pass

ENCRYPTION_ENABLED = _fernet is not None

# Binary file signatures we refuse outright — RINK only accepts text CSVs.
_BAD_SIGNATURES = [
    b"MZ",            # Windows PE / .exe / .dll
    b"\x7fELF",       # Linux ELF binary
    b"PK\x03\x04",    # zip / xlsx / docx / jar
    b"PK\x05\x06",    # empty zip
    b"%PDF",          # PDF
    b"\x1f\x8b",      # gzip
    b"Rar!",          # RAR archive
    b"\xff\xd8\xff",  # JPEG
    b"\x89PNG",       # PNG
    b"BM",            # BMP
    b"\xca\xfe\xba\xbe",  # Java class / Mach-O fat binary
]

# ---------------------------------------------------------------------------
# App + CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="RINK ML Service", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class InputData(BaseModel):
    values: List[float] = Field(..., min_length=1)
    # Horizon is user-controlled. Cap at 1825 (≈5 years of daily steps) purely
    # as an abuse guard — there is no hard "30-day" limit.
    steps: int = Field(10, ge=1, le=1825)


class TrainRequest(BaseModel):
    column: Optional[str] = None
    # Multivariate forecasting: extra numeric columns used as exogenous
    # predictors (covariates) for the target. When omitted, the model is
    # univariate (target's own lags only).
    feature_columns: Optional[List[str]] = None
    # Grouped / panel data: forecast a single series by filtering to one group.
    group_column: Optional[str] = None
    group_value: Optional[str] = None
    # Training window. All optional — when omitted, ALL data is used.
    train_start: Optional[str] = None          # ISO date, inclusive
    train_end: Optional[str] = None            # ISO date, inclusive
    exclude_ranges: Optional[List[List[str]]] = None  # [["2020-01-01","2020-12-31"], ...]


class TrainResponse(BaseModel):
    status: str
    rows_used: int
    column: str
    feature_columns: List[str] = []
    available_columns: List[str] = []
    date_column: Optional[str] = None
    group_column: Optional[str] = None
    group_value: Optional[str] = None
    frequency: str = "unknown"
    days_per_step: Optional[float] = None
    train_start: Optional[str] = None
    train_end: Optional[str] = None
    rmse: float
    mae: float


class PredictResponse(BaseModel):
    predictions: List[float]


class DataResponse(BaseModel):
    column: str
    available_columns: List[str] = []
    data: List[float]
    dates: Optional[List[str]] = None
    frequency: str = "unknown"
    date_column: Optional[str] = None
    group_column: Optional[str] = None
    group_value: Optional[str] = None
    days_per_step: Optional[float] = None


# --- Schema analysis ---------------------------------------------------------

class ColumnProfile(BaseModel):
    name: str
    dtype: str               # "date" | "numeric" | "categorical"
    unique_count: int
    null_count: int
    sample_values: List[str]
    is_date: bool
    is_numeric: bool
    is_id_candidate: bool


class AnalyzeResponse(BaseModel):
    rows: int
    columns: List[ColumnProfile]
    suggested_date_column: Optional[str] = None
    suggested_value_column: Optional[str] = None
    suggested_group_column: Optional[str] = None
    is_panel_data: bool = False
    group_values: Optional[List[str]] = None
    date_min: Optional[str] = None
    date_max: Optional[str] = None
    encryption_at_rest: bool = False
    warnings: List[str] = []


# ---------------------------------------------------------------------------
# Per-user paths
# ---------------------------------------------------------------------------

@dataclass
class UserPaths:
    user_id: str
    dir: Path
    dataset: Path
    model: Path
    meta: Path

    def ensure_dir(self) -> None:
        self.dir.mkdir(parents=True, exist_ok=True)


def _verify_gateway(request: Request) -> None:
    if not GATEWAY_SECRET:
        return
    supplied = request.headers.get("X-Gateway-Secret", "")
    if supplied != GATEWAY_SECRET:
        raise HTTPException(status_code=401, detail="Invalid gateway credentials")


def _get_paths(request: Request) -> UserPaths:
    _verify_gateway(request)
    user_id = (request.headers.get("X-User-ID") or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing X-User-ID header")
    if not USER_ID_RE.match(user_id):
        raise HTTPException(status_code=400, detail="Invalid X-User-ID format")
    user_dir = USERS_DIR / user_id
    return UserPaths(
        user_id=user_id,
        dir=user_dir,
        dataset=user_dir / "uploaded.csv",
        model=user_dir / "model.joblib",
        meta=user_dir / "meta.joblib",
    )


# ---------------------------------------------------------------------------
# Date detection + frequency inference (unchanged)
# ---------------------------------------------------------------------------

def _detect_date_column(df: pd.DataFrame) -> Optional[str]:
    for col in DATE_COLUMN_CANDIDATES:
        if col in df.columns:
            try:
                parsed = pd.to_datetime(df[col], errors="coerce")
                if parsed.notna().sum() >= max(2, int(0.5 * len(df))):
                    return col
            except Exception:
                pass
    for col in df.columns:
        if df[col].dtype != "object":
            continue
        sample = df[col].dropna().head(20)
        if sample.empty:
            continue
        try:
            parsed = pd.to_datetime(sample, errors="coerce")
            if parsed.notna().sum() >= max(2, int(0.6 * len(sample))):
                return col
        except Exception:
            continue
    return None


def _infer_frequency(dates: pd.Series) -> Tuple[str, Optional[float]]:
    sorted_dates = pd.to_datetime(dates).dropna().sort_values().reset_index(drop=True)
    if len(sorted_dates) < 2:
        return ("unknown", None)
    deltas = sorted_dates.diff().dropna()
    seconds = deltas.dt.total_seconds()
    # Drop zero-length gaps from duplicate timestamps. Panel/grouped data
    # (e.g. many rows sharing one date) would otherwise collapse the median to
    # 0 and report a bogus "every 0.0h" frequency with a ~1h step.
    seconds = seconds[seconds > 0]
    if seconds.empty:
        return ("unknown", None)
    median_seconds = seconds.median()
    if median_seconds is None or np.isnan(median_seconds):
        return ("unknown", None)
    median_days = median_seconds / 86400.0
    if median_days < 0.5:
        return (f"every {median_seconds/3600:.1f}h", median_days or 1 / 24)
    if abs(median_days - 1) < 0.4:
        return ("daily", 1.0)
    if abs(median_days - 7) < 1.0:
        return ("weekly", 7.0)
    if 27 <= median_days <= 32:
        return ("monthly", 30.0)
    if 88 <= median_days <= 95:
        return ("quarterly", 91.0)
    if 360 <= median_days <= 370:
        return ("yearly", 365.0)
    return (f"every {median_days:.1f} days", median_days)


def _list_numeric_columns(df: pd.DataFrame, exclude: Optional[List[str]] = None) -> List[str]:
    excluded = set(exclude or [])
    return [c for c in df.select_dtypes(include=[np.number]).columns if c not in excluded]


def _detect_value_column(df: pd.DataFrame, exclude: Optional[List[str]] = None) -> str:
    excluded = set(exclude or [])
    for col in PREFERRED_VALUE_COLUMNS:
        if col in df.columns and col not in excluded:
            return col
    numeric_cols = _list_numeric_columns(df, exclude=exclude)
    if not numeric_cols:
        raise HTTPException(
            status_code=400,
            detail="CSV has no numeric columns to forecast on.",
        )
    return numeric_cols[0]


def _resolve_value_column(
    df: pd.DataFrame,
    paths: UserPaths,
    requested: Optional[str] = None,
    exclude: Optional[List[str]] = None,
) -> str:
    available = _list_numeric_columns(df, exclude=exclude)
    if requested and requested in available:
        return requested
    if paths.meta.exists():
        try:
            meta = joblib.load(paths.meta)
            saved = meta.get("column") if isinstance(meta, dict) else None
            if saved and saved in available:
                return saved
        except Exception:
            pass
    return _detect_value_column(df, exclude=exclude)


# ---------------------------------------------------------------------------
# Dataset/model IO (per-user)
# ---------------------------------------------------------------------------

# --- Encryption + content scanning ------------------------------------------

def _encrypt_bytes(data: bytes) -> bytes:
    return _fernet.encrypt(data) if _fernet else data


def _decrypt_bytes(data: bytes) -> bytes:
    """Decrypt if encryption is enabled. Falls back to returning the raw bytes
    when the payload isn't a Fernet token (e.g. files written before encryption
    was turned on), so existing data keeps working after enabling a key."""
    if not _fernet:
        return data
    try:
        return _fernet.decrypt(data)
    except InvalidToken:
        return data


def _scan_content(contents: bytes) -> None:
    """Lightweight malware / corruption guard for uploads.

    RINK only accepts text CSVs, so we reject anything that smells like a
    binary, archive, or executable, and anything that isn't decodable text.
    This is not a substitute for a full AV engine (see ClamAV note in docs)
    but it closes the obvious holes for a parse-only pipeline."""
    head = contents[:8]
    for sig in _BAD_SIGNATURES:
        if head.startswith(sig):
            raise HTTPException(
                status_code=400,
                detail="That file looks like a binary or archive, not a CSV. Only plain-text .csv files are accepted.",
            )
    try:
        text = contents.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = contents.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=400,
                detail="File is not valid text and was rejected.",
            )
    if "\x00" in text:
        raise HTTPException(
            status_code=400,
            detail="File contains binary (null) bytes and was rejected.",
        )


def _parse_exclude(exclude: Optional[str]) -> Optional[List[List[str]]]:
    """Parse a query-string exclude list of the form
    '2020-01-01:2020-12-31,2021-06-01:2021-07-01'."""
    if not exclude:
        return None
    ranges = []
    for part in exclude.split(","):
        part = part.strip()
        if not part or ":" not in part:
            continue
        a, b = part.split(":", 1)
        ranges.append([a.strip(), b.strip()])
    return ranges or None


def _apply_filters(
    df: pd.DataFrame,
    date_col: Optional[str],
    group_column: Optional[str] = None,
    group_value: Optional[str] = None,
    train_start: Optional[str] = None,
    train_end: Optional[str] = None,
    exclude_ranges: Optional[List[List[str]]] = None,
) -> pd.DataFrame:
    """Filter to a single group and/or a date window. df's date_col is assumed
    already parsed to datetime by _prepare_dataset."""
    out = df
    if group_column and group_column in out.columns and group_value is not None:
        out = out[out[group_column].astype(str) == str(group_value)]
    if date_col and date_col in out.columns:
        if train_start:
            try:
                out = out[out[date_col] >= pd.to_datetime(train_start)]
            except Exception:
                pass
        if train_end:
            try:
                out = out[out[date_col] <= pd.to_datetime(train_end)]
            except Exception:
                pass
        for rng in (exclude_ranges or []):
            try:
                s = pd.to_datetime(rng[0])
                e = pd.to_datetime(rng[1])
                out = out[~((out[date_col] >= s) & (out[date_col] <= e))]
            except Exception:
                pass
    return out.reset_index(drop=True)


def _load_dataset(paths: UserPaths) -> pd.DataFrame:
    if not paths.dataset.exists():
        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded yet. POST a CSV to /upload first.",
        )
    try:
        raw = _decrypt_bytes(paths.dataset.read_bytes())
        df = pd.read_csv(io.BytesIO(raw))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {exc}")
    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")
    return df


def _prepare_dataset(paths: UserPaths) -> Tuple[pd.DataFrame, Optional[str], str, Optional[float]]:
    df = _load_dataset(paths)
    date_col = _detect_date_column(df)
    if date_col is None:
        return df, None, "unknown", None
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    df = df.dropna(subset=[date_col])
    df = df.sort_values(date_col).reset_index(drop=True)
    frequency, days_per_step = _infer_frequency(df[date_col])
    return df, date_col, frequency, days_per_step


def _build_features(series: pd.Series) -> pd.DataFrame:
    df = pd.DataFrame({"y": series.values})
    for lag in LAGS:
        df[f"lag{lag}"] = df["y"].shift(lag)
    for w in ROLLING_WINDOWS:
        df[f"rmean{w}"] = df["y"].shift(1).rolling(w).mean()
    return df.dropna().reset_index(drop=True)


def _features_from_history(history: List[float]) -> np.ndarray:
    n_needed = max(max(LAGS), max(ROLLING_WINDOWS) + 1)
    if len(history) < n_needed:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {n_needed} historical values; got {len(history)}.",
        )
    feats: List[float] = []
    for lag in LAGS:
        feats.append(history[-lag])
    for w in ROLLING_WINDOWS:
        feats.append(float(np.mean(history[-(w + 1):-1])))
    return np.array(feats, dtype=float).reshape(1, -1)


# --- Multivariate (exogenous) feature engineering ---------------------------

def _build_features_mv(
    df: pd.DataFrame, target: str, feature_cols: List[str]
) -> pd.DataFrame:
    """Build a feature matrix for multivariate forecasting.

    Features: the target's own lags + rolling means (as in the univariate
    case) PLUS the *lagged* values of each exogenous column. Only lags
    (lag >= 1) of the exogenous columns are used — never their contemporaneous
    value — so there is no look-ahead leakage and the recursive forecaster can
    advance every series one step at a time.

    Column order is deterministic and must match ``_mv_feature_row``.
    """
    y = pd.to_numeric(df[target], errors="coerce")
    out = pd.DataFrame({"y": y.values})
    for lag in LAGS:
        out[f"y_lag{lag}"] = out["y"].shift(lag)
    for w in ROLLING_WINDOWS:
        out[f"y_rmean{w}"] = out["y"].shift(1).rolling(w).mean()
    for col in feature_cols:
        s = pd.to_numeric(df[col], errors="coerce").reset_index(drop=True)
        for lag in LAGS:
            out[f"{col}_lag{lag}"] = s.shift(lag)
    return out.dropna().reset_index(drop=True)


def _mv_feature_row(
    target_hist: List[float],
    exog_hist: dict,
    feature_cols: List[str],
) -> np.ndarray:
    """Build a single feature vector for the next step, matching the column
    order produced by ``_build_features_mv``. ``*_hist`` lists hold values up to
    (but not including) the step being predicted."""
    feats: List[float] = []
    for lag in LAGS:
        feats.append(target_hist[-lag])
    for w in ROLLING_WINDOWS:
        feats.append(float(np.mean(target_hist[-(w + 1):-1])))
    for col in feature_cols:
        h = exog_hist[col]
        for lag in LAGS:
            feats.append(h[-lag])
    return np.array(feats, dtype=float).reshape(1, -1)


def _save_model(paths: UserPaths, model: GradientBoostingRegressor, meta: dict) -> None:
    paths.ensure_dir()
    joblib.dump(model, paths.model)
    joblib.dump(meta, paths.meta)


def _load_model(paths: UserPaths) -> Tuple[GradientBoostingRegressor, dict]:
    if not paths.model.exists() or not paths.meta.exists():
        raise HTTPException(
            status_code=409,
            detail="Model has not been trained yet. POST to /train first.",
        )
    return joblib.load(paths.model), joblib.load(paths.meta)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "users_dir": str(USERS_DIR),
        "user_count": sum(1 for _ in USERS_DIR.glob("*")) if USERS_DIR.exists() else 0,
        "gateway_secret_required": bool(GATEWAY_SECRET),
        "encryption_at_rest": ENCRYPTION_ENABLED,
    }


@app.post("/upload")
async def upload(request: Request, file: UploadFile = File(...)) -> dict:
    paths = _get_paths(request)

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10MB).")

    # 1. Malware / corruption guard.
    _scan_content(contents)

    # 2. Must parse as a real CSV.
    try:
        pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")

    # 3. Encrypt before it touches disk.
    paths.ensure_dir()
    paths.dataset.write_bytes(_encrypt_bytes(contents))
    log.info(
        "[user=%s] stored dataset (%d bytes, encrypted=%s)",
        paths.user_id, len(contents), ENCRYPTION_ENABLED,
    )
    return {"status": "uploaded", "bytes": len(contents), "encrypted": ENCRYPTION_ENABLED}


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: Request) -> AnalyzeResponse:
    """Profile the uploaded CSV so the client can confirm the schema before
    training. Detects the date column, numeric value candidates, and (for
    panel data like 'weather per city per day') a grouping/ID column."""
    paths = _get_paths(request)
    df = _load_dataset(paths)
    rows = len(df)
    date_col = _detect_date_column(df)

    profiles: List[ColumnProfile] = []
    numeric_cols: List[str] = []
    id_candidates: List[Tuple[str, int]] = []

    for col in df.columns:
        s = df[col]
        nunique = int(s.nunique(dropna=True))
        nulls = int(s.isna().sum())
        is_numeric = bool(pd.api.types.is_numeric_dtype(s)) and col != date_col
        is_date = col == date_col
        # An ID/group candidate is a non-numeric, non-date column whose
        # cardinality is low enough to be a category (≥2, ≤90% of rows, ≤1000).
        is_id = (
            (not is_numeric)
            and (not is_date)
            and 2 <= nunique <= min(1000, max(2, int(0.9 * rows)))
        )
        if is_numeric:
            numeric_cols.append(col)
        if is_id:
            id_candidates.append((col, nunique))
        profiles.append(ColumnProfile(
            name=col,
            dtype="date" if is_date else ("numeric" if is_numeric else "categorical"),
            unique_count=nunique,
            null_count=nulls,
            sample_values=[str(v) for v in s.dropna().unique()[:5]],
            is_date=is_date,
            is_numeric=is_numeric,
            is_id_candidate=is_id,
        ))

    warnings: List[str] = []
    is_panel = False
    suggested_group: Optional[str] = None
    group_values: Optional[List[str]] = None

    # Panel detection: dates repeat AND some categorical makes (date, cat) unique.
    if date_col:
        dt = pd.to_datetime(df[date_col], errors="coerce")
        if dt.duplicated().any() and id_candidates:
            best = None
            for col, _n in sorted(id_candidates, key=lambda t: t[1]):
                if not df.duplicated(subset=[date_col, col]).any():
                    best = col
                    break
            if best is None:
                best = sorted(id_candidates, key=lambda t: t[1])[0][0]
            suggested_group = best
            is_panel = True
            group_values = [str(v) for v in df[best].dropna().unique()[:500]]
            warnings.append(
                f"Multiple rows share the same date — this looks like panel data grouped by "
                f"'{best}'. Pick one group to forecast a single, clean series."
            )

    # Suggested value column: prefer known names, else first numeric.
    suggested_value: Optional[str] = numeric_cols[0] if numeric_cols else None
    for pref in PREFERRED_VALUE_COLUMNS:
        if pref in numeric_cols:
            suggested_value = pref
            break

    date_min = date_max = None
    if date_col:
        dts = pd.to_datetime(df[date_col], errors="coerce").dropna()
        if len(dts):
            date_min = dts.min().strftime("%Y-%m-%d")
            date_max = dts.max().strftime("%Y-%m-%d")

    if not numeric_cols:
        warnings.append("No numeric columns found — at least one is required to forecast.")
    if not date_col:
        warnings.append("No date column detected — rows will be used in file order.")

    return AnalyzeResponse(
        rows=rows,
        columns=profiles,
        suggested_date_column=date_col,
        suggested_value_column=suggested_value,
        suggested_group_column=suggested_group,
        is_panel_data=is_panel,
        group_values=group_values,
        date_min=date_min,
        date_max=date_max,
        encryption_at_rest=ENCRYPTION_ENABLED,
        warnings=warnings,
    )


@app.post("/train", response_model=TrainResponse)
def train(request: Request, req: TrainRequest = TrainRequest()) -> TrainResponse:
    paths = _get_paths(request)
    df, date_col, frequency, days_per_step = _prepare_dataset(paths)

    # The group column (if any) must be excluded from value detection so a
    # categorical/ID column is never mistaken for the forecast target.
    excluded = [c for c in [date_col, req.group_column] if c]
    column = _resolve_value_column(df, paths, requested=req.column, exclude=excluded)
    available = _list_numeric_columns(df, exclude=excluded)

    # Filter to a single group + the requested training window.
    df = _apply_filters(
        df, date_col,
        group_column=req.group_column,
        group_value=req.group_value,
        train_start=req.train_start,
        train_end=req.train_end,
        exclude_ranges=req.exclude_ranges,
    )
    # Frequency may shift once filtered to one group — recompute.
    if date_col and len(df):
        frequency, days_per_step = _infer_frequency(df[date_col])

    series = pd.to_numeric(df[column], errors="coerce").dropna()
    if len(series) < MIN_TRAIN_ROWS:
        scope = f" for group '{req.group_value}'" if req.group_value else ""
        raise HTTPException(
            status_code=400,
            detail=(
                f"Need at least {MIN_TRAIN_ROWS} numeric rows in column '{column}'{scope}; "
                f"got {len(series)}. Widen the date range or pick a group with more history."
            ),
        )

    # Resolve exogenous feature columns (multivariate). Keep only valid numeric
    # columns that aren't the target itself.
    requested_features = req.feature_columns or []
    feature_columns = [c for c in requested_features if c in available and c != column]

    exog_models: dict = {}
    if feature_columns:
        # ---- Multivariate: target lags + lagged exogenous covariates ----
        feats = _build_features_mv(df, column, feature_columns)
        if len(feats) < MIN_TRAIN_ROWS:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Need at least {MIN_TRAIN_ROWS} aligned rows for multivariate "
                    f"training; got {len(feats)} after aligning '{column}' with "
                    f"{feature_columns}. Remove a feature column or widen the date range."
                ),
            )
        fcols = [c for c in feats.columns if c != "y"]
        X = feats[fcols].values
        y = feats["y"].values

        # A small component model per exogenous column lets us advance each
        # covariate one step at a time during recursive forecasting.
        min_hist = max(max(LAGS), max(ROLLING_WINDOWS) + 1)
        for col in feature_columns:
            col_series = pd.to_numeric(df[col], errors="coerce").dropna()
            cfeats = _build_features(col_series)
            if len(cfeats) < min_hist:
                raise HTTPException(
                    status_code=400,
                    detail=f"Feature column '{col}' has too few numeric rows to model.",
                )
            ccols = [c for c in cfeats.columns if c != "y"]
            cm = GradientBoostingRegressor(
                n_estimators=200, learning_rate=0.05, max_depth=3, random_state=42,
            )
            cm.fit(cfeats[ccols].values, cfeats["y"].values)
            exog_models[col] = cm
    else:
        # ---- Univariate: target's own lags + rolling means ----
        feats = _build_features(series)
        fcols = [c for c in feats.columns if c != "y"]
        X = feats[fcols].values
        y = feats["y"].values

    split = max(1, int(len(X) * 0.8))
    X_train, X_val = X[:split], X[split:]
    y_train, y_val = y[:split], y[split:]

    model = GradientBoostingRegressor(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=3,
        random_state=42,
    )
    model.fit(X_train, y_train)

    val_target = y_val if len(y_val) else y_train
    val_pred = model.predict(X_val) if len(X_val) else model.predict(X_train)
    rmse = float(np.sqrt(mean_squared_error(val_target, val_pred)))
    mae = float(mean_absolute_error(val_target, val_pred))

    train_start = train_end = None
    if date_col and len(df):
        train_start = df[date_col].min().strftime("%Y-%m-%d")
        train_end = df[date_col].max().strftime("%Y-%m-%d")

    _save_model(
        paths,
        model,
        {
            "column": column,
            "feature_columns": feature_columns,
            "exog_models": exog_models,
            "date_column": date_col,
            "group_column": req.group_column,
            "group_value": req.group_value,
            "frequency": frequency,
            "days_per_step": days_per_step,
        },
    )
    log.info(
        "[user=%s] trained on %d rows (col=%s, features=%s, group=%s/%s, date=%s, freq=%s) RMSE=%.4f MAE=%.4f",
        paths.user_id, len(feats), column, feature_columns or "-",
        req.group_column, req.group_value, date_col, frequency, rmse, mae,
    )

    return TrainResponse(
        status="trained",
        rows_used=len(feats),
        column=column,
        feature_columns=feature_columns,
        available_columns=available,
        date_column=date_col,
        group_column=req.group_column,
        group_value=req.group_value,
        frequency=frequency,
        days_per_step=days_per_step,
        train_start=train_start,
        train_end=train_end,
        rmse=rmse,
        mae=mae,
    )


def _forecast_multivariate(
    paths: UserPaths, model, meta: dict, steps: int
) -> List[float]:
    """Recursive multi-step forecast for a multivariate model.

    Seeds histories from the user's stored series (group-filtered to match
    training), then for each step: predicts the target from target lags +
    lagged covariates, appends it, and advances every covariate one step using
    its own component model (persistence if a component model is missing)."""
    target = meta["column"]
    feature_cols = [c for c in (meta.get("feature_columns") or [])]
    exog_models = meta.get("exog_models") or {}

    df, date_col, _freq, _dps = _prepare_dataset(paths)
    df = _apply_filters(
        df, date_col,
        group_column=meta.get("group_column"),
        group_value=meta.get("group_value"),
    )
    cols = [target] + [c for c in feature_cols if c in df.columns]
    if target not in df.columns:
        raise HTTPException(
            status_code=400,
            detail=f"Target column '{target}' is no longer in the dataset; re-train.",
        )
    feature_cols = [c for c in feature_cols if c in df.columns]
    sub = df[cols].apply(lambda c: pd.to_numeric(c, errors="coerce")).dropna().reset_index(drop=True)
    min_hist = max(max(LAGS), max(ROLLING_WINDOWS) + 1)
    if len(sub) < min_hist:
        raise HTTPException(
            status_code=400,
            detail=f"Not enough aligned history to forecast (need {min_hist}, have {len(sub)}).",
        )

    target_hist = sub[target].astype(float).tolist()
    exog_hist = {c: sub[c].astype(float).tolist() for c in feature_cols}

    predictions: List[float] = []
    for _ in range(steps):
        x = _mv_feature_row(target_hist, exog_hist, feature_cols)
        yhat = float(model.predict(x)[0])
        predictions.append(yhat)
        target_hist.append(yhat)
        for c in feature_cols:
            cm = exog_models.get(c)
            if cm is None:
                exog_hist[c].append(exog_hist[c][-1])  # persistence fallback
            else:
                cx = _features_from_history(exog_hist[c])
                exog_hist[c].append(float(cm.predict(cx)[0]))
    return predictions


@app.post("/predict", response_model=PredictResponse)
def predict(request: Request, data: InputData) -> PredictResponse:
    paths = _get_paths(request)
    model, meta = _load_model(paths)
    feature_cols = (meta.get("feature_columns") if isinstance(meta, dict) else None) or []

    # Multivariate models need future covariate values, so they forecast from
    # the user's stored series rather than the client-supplied `values`.
    if feature_cols:
        predictions = _forecast_multivariate(paths, model, meta, data.steps)
        return PredictResponse(predictions=predictions)

    history = list(data.values)
    predictions = []
    for _ in range(data.steps):
        x = _features_from_history(history)
        yhat = float(model.predict(x)[0])
        predictions.append(yhat)
        history.append(yhat)
    return PredictResponse(predictions=predictions)


@app.get("/data", response_model=DataResponse)
def get_data(
    request: Request,
    limit: int = 5000,
    column: Optional[str] = None,
    group_column: Optional[str] = None,
    group_value: Optional[str] = None,
    train_start: Optional[str] = None,
    train_end: Optional[str] = None,
    exclude: Optional[str] = None,
) -> DataResponse:
    paths = _get_paths(request)
    if not paths.dataset.exists():
        # Fresh user — show a tiny demo so the dashboard renders.
        return DataResponse(
            column="demo",
            available_columns=["demo"],
            data=[7.1, 7.2, 7.3, 7.4, 7.5],
            dates=None,
            frequency="unknown",
            date_column=None,
            days_per_step=None,
        )

    df, date_col, frequency, days_per_step = _prepare_dataset(paths)
    excluded = [c for c in [date_col, group_column] if c]
    chosen = _resolve_value_column(df, paths, requested=column, exclude=excluded)
    available = _list_numeric_columns(df, exclude=excluded)

    df = _apply_filters(
        df, date_col,
        group_column=group_column,
        group_value=group_value,
        train_start=train_start,
        train_end=train_end,
        exclude_ranges=_parse_exclude(exclude),
    )
    if date_col and len(df):
        frequency, days_per_step = _infer_frequency(df[date_col])

    series_raw = pd.to_numeric(df[chosen], errors="coerce")
    mask = series_raw.notna()

    series = series_raw[mask]
    dates_iso: Optional[List[str]] = None
    if date_col:
        dates_iso = df.loc[mask, date_col].dt.strftime("%Y-%m-%d").tolist()

    # Default limit is now generous (5000) so "use all data" really means all.
    n = max(1, min(limit, 20000))
    series = series.tail(n)
    if dates_iso is not None:
        dates_iso = dates_iso[-n:]

    return DataResponse(
        column=chosen,
        available_columns=available,
        data=series.astype(float).tolist(),
        dates=dates_iso,
        frequency=frequency,
        date_column=date_col,
        group_column=group_column,
        group_value=group_value,
        days_per_step=days_per_step,
    )


@app.delete("/user-data")
def delete_user_data(request: Request) -> dict:
    """Permanently remove the calling user's uploaded CSV and trained model."""
    paths = _get_paths(request)
    removed = False
    if paths.dir.exists():
        shutil.rmtree(paths.dir, ignore_errors=True)
        removed = True
    log.info("[user=%s] data deleted=%s", paths.user_id, removed)
    return {"status": "deleted", "removed": removed}


# ===========================================================================
# Anomaly Detection
# ===========================================================================

class AnomalyResponse(BaseModel):
    column: str
    date_column: Optional[str] = None
    frequency: str = "unknown"
    contamination: float
    rows: int
    anomalies: int
    anomaly_rate: float
    threshold: float
    points: List[dict]


def _read_uploaded_csv(file_bytes: bytes) -> pd.DataFrame:
    try:
        df = pd.read_csv(io.BytesIO(file_bytes))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")
    if df.empty:
        raise HTTPException(status_code=400, detail="CSV is empty.")
    return df


def _validate_upload(file: UploadFile, contents: bytes) -> None:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10MB).")


@app.post("/anomaly/detect", response_model=AnomalyResponse)
async def anomaly_detect(
    request: Request,
    file: UploadFile = File(...),
    column: Optional[str] = Form(None),
    contamination: float = Form(0.05),
) -> AnomalyResponse:
    """Run IsolationForest on the value column and flag anomalous rows."""
    _get_paths(request)  # auth / header validation
    if not (0.001 <= contamination <= 0.5):
        raise HTTPException(status_code=400, detail="contamination must be between 0.001 and 0.5")

    contents = await file.read()
    _validate_upload(file, contents)
    df = _read_uploaded_csv(contents)

    # Date detection + chronological sort (reuse forecasting helpers)
    date_col = _detect_date_column(df)
    frequency = "unknown"
    if date_col is not None:
        df = df.copy()
        df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
        df = df.dropna(subset=[date_col]).sort_values(date_col).reset_index(drop=True)
        frequency, _ = _infer_frequency(df[date_col])

    excluded = [date_col] if date_col else None
    target = column if column and column in df.columns else _detect_value_column(df, exclude=excluded)
    series = pd.to_numeric(df[target], errors="coerce")
    mask = series.notna()
    series = series[mask]
    if len(series) < 20:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 20 numeric rows to detect anomalies (got {len(series)}).",
        )

    # Use lag-augmented features so anomalies are detected relative to local
    # context rather than the global mean. Falls back to plain values when
    # the series is short.
    feats = pd.DataFrame({"y": series.values})
    feats["lag1"] = feats["y"].shift(1)
    feats["lag2"] = feats["y"].shift(2)
    feats["rmean5"] = feats["y"].shift(1).rolling(5).mean()
    feats["rstd5"] = feats["y"].shift(1).rolling(5).std().fillna(0.0)
    feats = feats.fillna(method="bfill").fillna(0.0)

    model = IsolationForest(
        contamination=contamination, random_state=42, n_estimators=200
    )
    model.fit(feats.values)
    scores = -model.score_samples(feats.values)  # higher = more anomalous
    predictions = model.predict(feats.values)    # 1 normal, -1 anomalous
    is_anomaly = predictions == -1
    threshold = float(np.quantile(scores, 1 - contamination))

    if date_col is not None:
        dates_iso = df.loc[mask, date_col].dt.strftime("%Y-%m-%d").tolist()
    else:
        dates_iso = [None] * len(series)

    points = []
    for i in range(len(series)):
        points.append({
            "index": int(i),
            "date": dates_iso[i],
            "value": float(series.iloc[i]),
            "score": float(scores[i]),
            "is_anomaly": bool(is_anomaly[i]),
        })

    anomalies = int(is_anomaly.sum())
    return AnomalyResponse(
        column=target,
        date_column=date_col,
        frequency=frequency,
        contamination=contamination,
        rows=len(series),
        anomalies=anomalies,
        anomaly_rate=anomalies / max(1, len(series)),
        threshold=threshold,
        points=points,
    )


# ===========================================================================
# Churn Prediction
# ===========================================================================

class ChurnPredictionItem(BaseModel):
    index: int
    probability: float
    risk: str  # "low" | "medium" | "high"


class ChurnResponse(BaseModel):
    label_column: str
    feature_columns: List[str]
    rows: int
    train_size: int
    test_size: int
    accuracy: float
    auc: Optional[float] = None
    base_rate: float
    feature_importance: List[dict]
    risk_distribution: dict
    confusion: dict
    top_at_risk: List[dict]


def _detect_label_column(df: pd.DataFrame) -> Optional[str]:
    candidates = ["churn", "Churn", "CHURN", "label", "target", "churned", "is_churn"]
    for col in candidates:
        if col in df.columns:
            return col
    # Fall back to any boolean / 0-1 column
    for col in df.columns:
        try:
            unique = pd.to_numeric(df[col], errors="coerce").dropna().unique()
            if set(map(int, unique)).issubset({0, 1}) and len(unique) > 1:
                return col
        except Exception:
            continue
    return None


@app.post("/churn/predict", response_model=ChurnResponse)
async def churn_predict(
    request: Request,
    file: UploadFile = File(...),
    label: Optional[str] = Form(None),
) -> ChurnResponse:
    """Train a RandomForestClassifier on the uploaded customer table.
    The label column must contain 0/1 (or yes/no). All other numeric columns
    are used as features. String columns are one-hot encoded if low-cardinality."""
    _get_paths(request)
    contents = await file.read()
    _validate_upload(file, contents)
    df = _read_uploaded_csv(contents)

    label_col = label if label and label in df.columns else _detect_label_column(df)
    if not label_col:
        raise HTTPException(
            status_code=400,
            detail="Couldn't detect a churn / label column. Add a column called 'churn' with 0/1 values.",
        )

    y_raw = df[label_col]
    if y_raw.dtype == "object":
        truthy = {"yes", "y", "true", "1", "churned", "lost"}
        y = y_raw.astype(str).str.strip().str.lower().isin(truthy).astype(int)
    else:
        y = pd.to_numeric(y_raw, errors="coerce").fillna(0).astype(int)
        y = (y > 0).astype(int)

    base_rate = float(y.mean())
    if y.sum() < 5 or (len(y) - y.sum()) < 5:
        raise HTTPException(
            status_code=400,
            detail="Need at least 5 examples of each class (churned and retained).",
        )

    feat_df = df.drop(columns=[label_col])
    # Keep numeric columns as-is; one-hot encode object columns with ≤20 unique values.
    pieces = []
    feature_names = []
    for col in feat_df.columns:
        s = feat_df[col]
        if pd.api.types.is_numeric_dtype(s):
            pieces.append(s.astype(float).fillna(s.astype(float).median()))
            feature_names.append(col)
        elif s.dtype == "object":
            nunique = s.nunique(dropna=True)
            if 1 < nunique <= 20:
                dummies = pd.get_dummies(s, prefix=col, dummy_na=False).astype(float)
                pieces.extend([dummies[c] for c in dummies.columns])
                feature_names.extend(list(dummies.columns))
            # Skip high-cardinality strings (IDs, names, etc.)

    if not pieces:
        raise HTTPException(
            status_code=400,
            detail="No usable feature columns. Add numeric or low-cardinality categorical columns.",
        )

    X = pd.concat(pieces, axis=1).fillna(0.0)
    if len(X) < 30:
        raise HTTPException(status_code=400, detail="Need at least 30 rows.")

    X_train, X_test, y_train, y_test = train_test_split(
        X.values, y.values, test_size=0.2, random_state=42, stratify=y.values
    )

    clf = RandomForestClassifier(
        n_estimators=300, max_depth=8, random_state=42, n_jobs=-1
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]

    accuracy = float(accuracy_score(y_test, y_pred))
    try:
        auc = float(roc_auc_score(y_test, y_prob))
    except Exception:
        auc = None

    # Importance for top 15 features
    imp = sorted(
        zip(feature_names, clf.feature_importances_),
        key=lambda t: t[1],
        reverse=True,
    )[:15]
    importance_out = [{"feature": k, "importance": float(v)} for k, v in imp]

    # Score the entire dataset for the at-risk list
    full_probs = clf.predict_proba(X.values)[:, 1]
    risk = pd.Series(
        np.where(full_probs >= 0.7, "high", np.where(full_probs >= 0.4, "medium", "low"))
    )
    distribution = {
        "high": int((risk == "high").sum()),
        "medium": int((risk == "medium").sum()),
        "low": int((risk == "low").sum()),
    }

    # Confusion matrix on the held-out test set
    tn = int(((y_pred == 0) & (y_test == 0)).sum())
    fp = int(((y_pred == 1) & (y_test == 0)).sum())
    fn = int(((y_pred == 0) & (y_test == 1)).sum())
    tp = int(((y_pred == 1) & (y_test == 1)).sum())

    # Top 10 highest-risk rows from the full dataset, with their original row values
    order = np.argsort(-full_probs)[:10]
    top_at_risk = []
    for i in order:
        row = df.iloc[int(i)]
        # only echo non-label columns, and stringify everything for safe JSON
        echo = {k: (str(row[k]) if pd.notna(row[k]) else None) for k in df.columns if k != label_col}
        top_at_risk.append({
            "index": int(i),
            "probability": float(full_probs[i]),
            "row": echo,
        })

    return ChurnResponse(
        label_column=label_col,
        feature_columns=feature_names,
        rows=len(df),
        train_size=len(X_train),
        test_size=len(X_test),
        accuracy=accuracy,
        auc=auc,
        base_rate=base_rate,
        feature_importance=importance_out,
        risk_distribution=distribution,
        confusion={"tn": tn, "fp": fp, "fn": fn, "tp": tp},
        top_at_risk=top_at_risk,
    )


# ===========================================================================
# TSP (Travelling Salesman Problem)
# ===========================================================================

class Point(BaseModel):
    name: Optional[str] = None
    x: float
    y: float


class TSPRequest(BaseModel):
    points: List[Point] = Field(..., min_length=2, max_length=200)
    return_to_start: bool = True


class TSPResponse(BaseModel):
    route: List[int]
    names: List[str]
    coordinates: List[List[float]]
    total_distance: float
    legs: List[dict]
    improved_from: float
    iterations: int


def _distance_matrix(points: List[Point]) -> np.ndarray:
    coords = np.array([[p.x, p.y] for p in points])
    diff = coords[:, None, :] - coords[None, :, :]
    return np.sqrt((diff ** 2).sum(axis=-1))


def _nearest_neighbor(dist: np.ndarray) -> List[int]:
    n = len(dist)
    visited = [False] * n
    route = [0]
    visited[0] = True
    for _ in range(n - 1):
        last = route[-1]
        next_idx = -1
        next_d = float("inf")
        for j in range(n):
            if not visited[j] and dist[last, j] < next_d:
                next_d = dist[last, j]
                next_idx = j
        route.append(next_idx)
        visited[next_idx] = True
    return route


def _route_length(route: List[int], dist: np.ndarray, closed: bool) -> float:
    total = 0.0
    for i in range(len(route) - 1):
        total += dist[route[i], route[i + 1]]
    if closed:
        total += dist[route[-1], route[0]]
    return float(total)


def _two_opt(route: List[int], dist: np.ndarray, closed: bool, max_iter: int = 500) -> Tuple[List[int], int]:
    """Standard 2-opt local search."""
    best = list(route)
    best_len = _route_length(best, dist, closed)
    n = len(best)
    iter_count = 0
    improved = True
    while improved and iter_count < max_iter:
        improved = False
        iter_count += 1
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                if j - i == 1:
                    continue
                candidate = best[:i] + best[i:j][::-1] + best[j:]
                cand_len = _route_length(candidate, dist, closed)
                if cand_len < best_len - 1e-9:
                    best = candidate
                    best_len = cand_len
                    improved = True
        if not improved:
            break
    return best, iter_count


@app.post("/tsp/solve", response_model=TSPResponse)
def tsp_solve(request: Request, body: TSPRequest) -> TSPResponse:
    """Solve the Travelling Salesman Problem with nearest-neighbor + 2-opt."""
    _get_paths(request)
    points = body.points
    closed = body.return_to_start
    dist = _distance_matrix(points)

    initial = _nearest_neighbor(dist)
    initial_len = _route_length(initial, dist, closed)
    optimized, iters = _two_opt(initial, dist, closed)
    optimized_len = _route_length(optimized, dist, closed)

    sequence = optimized + ([optimized[0]] if closed else [])
    names = [points[i].name or f"#{i}" for i in sequence]
    coordinates = [[points[i].x, points[i].y] for i in sequence]

    legs = []
    for k in range(len(sequence) - 1):
        a, b = sequence[k], sequence[k + 1]
        legs.append({
            "from": points[a].name or f"#{a}",
            "to": points[b].name or f"#{b}",
            "distance": float(dist[a, b]),
        })

    return TSPResponse(
        route=sequence,
        names=names,
        coordinates=coordinates,
        total_distance=float(optimized_len),
        legs=legs,
        improved_from=float(initial_len),
        iterations=iters,
    )


# ===========================================================================
# VRP (Vehicle Routing Problem) — capacitated
# ===========================================================================

class VRPPoint(BaseModel):
    name: Optional[str] = None
    x: float
    y: float
    demand: float = 1.0


class VRPRequest(BaseModel):
    depot: Point
    customers: List[VRPPoint] = Field(..., min_length=1, max_length=200)
    num_vehicles: int = Field(3, ge=1, le=50)
    vehicle_capacity: float = Field(..., gt=0)


class VRPRoute(BaseModel):
    vehicle: int
    sequence: List[int]
    names: List[str]
    coordinates: List[List[float]]
    distance: float
    load: float


class VRPResponse(BaseModel):
    routes: List[VRPRoute]
    total_distance: float
    total_load: float
    unserved: List[int]
    vehicle_capacity: float
    method: str


def _vrp_savings(depot: Point, customers: List[VRPPoint], num_vehicles: int, capacity: float):
    """Clarke-Wright savings heuristic, then capacity-aware route assembly."""
    all_points = [depot] + [Point(name=c.name, x=c.x, y=c.y) for c in customers]
    dist = _distance_matrix(all_points)
    n = len(customers)
    demands = [c.demand for c in customers]
    if any(d > capacity for d in demands):
        # any single customer demand exceeds vehicle capacity → infeasible
        raise HTTPException(
            status_code=400,
            detail="At least one customer demand exceeds vehicle capacity.",
        )

    # Initial: each customer is its own route from the depot.
    routes = [[i + 1] for i in range(n)]  # indices into all_points

    # Compute savings s(i,j) = d(0,i) + d(0,j) - d(i,j)
    savings = []
    for i in range(1, n + 1):
        for j in range(i + 1, n + 1):
            s = dist[0, i] + dist[0, j] - dist[i, j]
            savings.append((s, i, j))
    savings.sort(reverse=True)

    # Track which route each customer is in and its load.
    route_of = {i + 1: i for i in range(n)}
    loads = list(demands)  # parallel to routes

    def can_merge(ri, rj, i, j):
        if ri == rj:
            return False
        if loads[ri] + loads[rj] > capacity:
            return False
        # Only merge if i and j are at the ends of their routes.
        return (routes[ri][-1] == i and routes[rj][0] == j) or (
            routes[rj][-1] == i and routes[ri][0] == j
        ) or (routes[ri][-1] == j and routes[rj][0] == i) or (
            routes[rj][-1] == j and routes[ri][0] == i
        )

    for s, i, j in savings:
        if s <= 0:
            break
        ri = route_of[i]
        rj = route_of[j]
        if not can_merge(ri, rj, i, j):
            continue
        # Orient and concatenate.
        if routes[ri][-1] == i and routes[rj][0] == j:
            merged = routes[ri] + routes[rj]
        elif routes[ri][-1] == j and routes[rj][0] == i:
            merged = routes[ri] + routes[rj]
        elif routes[rj][-1] == i and routes[ri][0] == j:
            merged = routes[rj] + routes[ri]
        elif routes[rj][-1] == j and routes[ri][0] == i:
            merged = routes[rj] + routes[ri]
        else:
            continue
        merged_load = loads[ri] + loads[rj]
        routes[ri] = merged
        loads[ri] = merged_load
        for k in merged:
            route_of[k] = ri
        routes[rj] = []
        loads[rj] = 0

    active = [(routes[k], loads[k]) for k in range(n) if routes[k]]
    # Sort by load desc; truncate to num_vehicles; leftover customers are unserved.
    active.sort(key=lambda t: -t[1])
    chosen = active[:num_vehicles]
    leftover_routes = active[num_vehicles:]
    unserved = []
    for rt, _load in leftover_routes:
        unserved.extend(rt)
    # Translate back from all_points index (1..n) to customers index (0..n-1).
    chosen_customers = [
        ([k - 1 for k in rt], load) for rt, load in chosen
    ]
    unserved_customers = [k - 1 for k in unserved]
    return chosen_customers, unserved_customers, dist


# ===========================================================================
# Customer Segmentation (K-means)
# ===========================================================================

class SegmentationCluster(BaseModel):
    id: int
    size: int
    pct: float
    centroid: dict
    label: str


class SegmentationPoint(BaseModel):
    index: int
    cluster: int
    x: float
    y: float


class SegmentationResponse(BaseModel):
    n_clusters: int
    rows: int
    features_used: List[str]
    silhouette: Optional[float] = None
    inertia: float
    auto_k: bool
    clusters: List[SegmentationCluster]
    points: List[SegmentationPoint]


def _label_cluster(centroid_norm: np.ndarray, feature_names: List[str]) -> str:
    """Produce a short, human-readable label by picking the feature each
    cluster scores highest on relative to the others."""
    if len(centroid_norm) == 0:
        return "—"
    idx = int(np.argmax(centroid_norm))
    return f"High {feature_names[idx]}"


@app.post("/segmentation/run", response_model=SegmentationResponse)
async def segmentation_run(
    request: Request,
    file: UploadFile = File(...),
    k: Optional[int] = Form(None),
    features: Optional[str] = Form(None),  # comma-separated column names
) -> SegmentationResponse:
    """Run K-means on the uploaded customer table. If ``k`` is omitted,
    pick the value in [2..8] with the best silhouette score."""
    _get_paths(request)
    contents = await file.read()
    _validate_upload(file, contents)
    df = _read_uploaded_csv(contents)

    # Build the feature matrix.
    if features:
        wanted = [c.strip() for c in features.split(",") if c.strip()]
        missing = [c for c in wanted if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown column(s): {', '.join(missing)}",
            )
        feature_cols = [
            c for c in wanted if pd.api.types.is_numeric_dtype(df[c])
        ]
        if not feature_cols:
            raise HTTPException(
                status_code=400,
                detail="None of the requested columns are numeric.",
            )
    else:
        feature_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
        # Drop columns that look like row identifiers
        feature_cols = [
            c for c in feature_cols
            if not c.lower().endswith("_id") and c.lower() not in {"id", "index"}
        ]
        if len(feature_cols) < 2:
            raise HTTPException(
                status_code=400,
                detail="Need at least 2 numeric feature columns. Add some, or pass the `features` field.",
            )

    X_raw = df[feature_cols].copy()
    # Fill missing with median per-column.
    for c in X_raw.columns:
        X_raw[c] = X_raw[c].fillna(X_raw[c].median())
    n = len(X_raw)
    if n < 20:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least 20 rows (got {n}).",
        )

    scaler = StandardScaler()
    X = scaler.fit_transform(X_raw.values)

    # Choose k automatically by silhouette if not provided.
    if k is not None:
        if not 2 <= k <= 12:
            raise HTTPException(status_code=400, detail="k must be between 2 and 12.")
        chosen_k = k
        auto_k = False
    else:
        best_score = -1.0
        best_k = 3
        for candidate in range(2, min(9, n // 5)):
            kmodel = KMeans(n_clusters=candidate, n_init=10, random_state=42)
            labels = kmodel.fit_predict(X)
            if len(set(labels)) < 2:
                continue
            try:
                score = silhouette_score(X, labels, sample_size=min(2000, n), random_state=42)
            except Exception:
                continue
            if score > best_score:
                best_score = score
                best_k = candidate
        chosen_k = best_k
        auto_k = True

    final_model = KMeans(n_clusters=chosen_k, n_init=10, random_state=42)
    labels = final_model.fit_predict(X)
    inertia = float(final_model.inertia_)
    try:
        sil = float(silhouette_score(X, labels, sample_size=min(2000, n), random_state=42))
    except Exception:
        sil = None

    # 2D projection so the frontend can plot it.
    pca = PCA(n_components=2)
    coords = pca.fit_transform(X)

    # Per-cluster summaries — centroid in ORIGINAL feature units.
    centroids_norm = final_model.cluster_centers_
    centroids_orig = scaler.inverse_transform(centroids_norm)

    clusters: List[SegmentationCluster] = []
    for cid in range(chosen_k):
        size = int((labels == cid).sum())
        centroid_dict = {
            feature_cols[i]: float(centroids_orig[cid, i])
            for i in range(len(feature_cols))
        }
        clusters.append(SegmentationCluster(
            id=cid,
            size=size,
            pct=size / max(1, n),
            centroid=centroid_dict,
            label=_label_cluster(centroids_norm[cid], feature_cols),
        ))

    points = [
        SegmentationPoint(
            index=int(i),
            cluster=int(labels[i]),
            x=float(coords[i, 0]),
            y=float(coords[i, 1]),
        )
        for i in range(n)
    ]

    return SegmentationResponse(
        n_clusters=chosen_k,
        rows=n,
        features_used=feature_cols,
        silhouette=sil,
        inertia=inertia,
        auto_k=auto_k,
        clusters=clusters,
        points=points,
    )


# ===========================================================================
# A/B Test Analyzer
# ===========================================================================

class ContinuousArm(BaseModel):
    name: str = "Group"
    values: List[float] = Field(..., min_length=2)


class ContinuousABRequest(BaseModel):
    control: ContinuousArm
    variant: ContinuousArm
    alpha: float = Field(0.05, gt=0, lt=0.5)


class ConversionArm(BaseModel):
    name: str = "Group"
    visitors: int = Field(..., gt=0)
    conversions: int = Field(..., ge=0)


class ConversionABRequest(BaseModel):
    control: ConversionArm
    variant: ConversionArm
    alpha: float = Field(0.05, gt=0, lt=0.5)


class ABArmSummary(BaseModel):
    name: str
    n: int
    metric: float            # mean (continuous) or rate (conversion)
    std_or_se: float
    ci_low: float
    ci_high: float


class ABResponse(BaseModel):
    test: str                # "welch-t", "mann-whitney", or "two-proportion-z"
    alpha: float
    control: ABArmSummary
    variant: ABArmSummary
    diff_absolute: float
    diff_relative: Optional[float]
    diff_ci_low: float
    diff_ci_high: float
    test_statistic: float
    df: Optional[float] = None
    p_value: float
    significant: bool
    interpretation: str
    required_sample_size_per_arm: Optional[int] = None
    notes: List[str] = []


def _interpret_ab(diff_abs: float, rel: Optional[float], p: float, alpha: float, control_name: str, variant_name: str) -> str:
    if p < alpha:
        direction = "outperforms" if diff_abs > 0 else "underperforms"
        rel_str = f" by {rel*100:.1f}%" if rel is not None and rel != 0 else ""
        return f"Statistically significant — {variant_name} {direction} {control_name}{rel_str} (p={p:.4f})."
    return f"Not statistically significant at α={alpha}. Difference could be due to chance (p={p:.4f})."


@app.post("/abtest/continuous", response_model=ABResponse)
def abtest_continuous(request: Request, body: ContinuousABRequest) -> ABResponse:
    """Welch's t-test for two independent samples with unequal variances.
    Returns means, 95% CIs, and the difference with CI."""
    _get_paths(request)
    a = np.asarray(body.control.values, dtype=float)
    b = np.asarray(body.variant.values, dtype=float)
    a = a[np.isfinite(a)]
    b = b[np.isfinite(b)]
    if len(a) < 2 or len(b) < 2:
        raise HTTPException(status_code=400, detail="Each arm needs at least 2 numeric values.")

    n_a, n_b = len(a), len(b)
    mean_a, mean_b = float(a.mean()), float(b.mean())
    var_a = float(a.var(ddof=1))
    var_b = float(b.var(ddof=1))
    se_a = float(np.sqrt(var_a / n_a))
    se_b = float(np.sqrt(var_b / n_b))

    # Welch's t-test
    t_stat, p_value = scipy_stats.ttest_ind(a, b, equal_var=False)
    # Welch-Satterthwaite degrees of freedom
    df = (var_a / n_a + var_b / n_b) ** 2 / (
        (var_a / n_a) ** 2 / max(1, n_a - 1) + (var_b / n_b) ** 2 / max(1, n_b - 1)
    )
    t_crit = scipy_stats.t.ppf(1 - body.alpha / 2, df)

    # Per-arm 95% CIs (mean ± t_crit * se)
    ci_a_low = mean_a - t_crit * se_a
    ci_a_high = mean_a + t_crit * se_a
    ci_b_low = mean_b - t_crit * se_b
    ci_b_high = mean_b + t_crit * se_b

    # CI on the difference
    diff = mean_b - mean_a
    se_diff = float(np.sqrt(var_a / n_a + var_b / n_b))
    diff_low = diff - t_crit * se_diff
    diff_high = diff + t_crit * se_diff
    rel = (diff / mean_a) if mean_a != 0 else None

    return ABResponse(
        test="welch-t",
        alpha=body.alpha,
        control=ABArmSummary(
            name=body.control.name, n=n_a, metric=mean_a,
            std_or_se=se_a, ci_low=ci_a_low, ci_high=ci_a_high,
        ),
        variant=ABArmSummary(
            name=body.variant.name, n=n_b, metric=mean_b,
            std_or_se=se_b, ci_low=ci_b_low, ci_high=ci_b_high,
        ),
        diff_absolute=float(diff),
        diff_relative=float(rel) if rel is not None else None,
        diff_ci_low=float(diff_low),
        diff_ci_high=float(diff_high),
        test_statistic=float(t_stat),
        df=float(df),
        p_value=float(p_value),
        significant=bool(p_value < body.alpha),
        interpretation=_interpret_ab(diff, rel, float(p_value), body.alpha, body.control.name, body.variant.name),
        notes=[
            "Welch's t-test assumes the samples are independent. It does NOT assume equal variances.",
            "For heavily non-normal data, consider running a non-parametric test (Mann-Whitney U).",
        ],
    )


@app.post("/abtest/conversion", response_model=ABResponse)
def abtest_conversion(request: Request, body: ConversionABRequest) -> ABResponse:
    """Two-proportion z-test plus a required-sample-size estimate at 80% power."""
    _get_paths(request)
    c1, n1 = body.control.conversions, body.control.visitors
    c2, n2 = body.variant.conversions, body.variant.visitors
    if c1 > n1 or c2 > n2:
        raise HTTPException(status_code=400, detail="Conversions cannot exceed visitors.")
    if c1 == 0 and c2 == 0:
        raise HTTPException(status_code=400, detail="At least one arm must have conversions.")

    p1 = c1 / n1
    p2 = c2 / n2
    p_pool = (c1 + c2) / (n1 + n2)
    se_pool = float(np.sqrt(p_pool * (1 - p_pool) * (1 / n1 + 1 / n2))) if (0 < p_pool < 1) else 0.0
    z_stat = (p2 - p1) / se_pool if se_pool > 0 else 0.0
    p_value = float(2 * (1 - scipy_stats.norm.cdf(abs(z_stat))))

    # Per-arm Wald CIs (good enough for n*p >= 5)
    z_alpha = scipy_stats.norm.ppf(1 - body.alpha / 2)
    se1 = float(np.sqrt(p1 * (1 - p1) / n1))
    se2 = float(np.sqrt(p2 * (1 - p2) / n2))
    ci1 = (p1 - z_alpha * se1, p1 + z_alpha * se1)
    ci2 = (p2 - z_alpha * se2, p2 + z_alpha * se2)

    diff = p2 - p1
    se_diff = float(np.sqrt(se1 ** 2 + se2 ** 2))
    diff_low = diff - z_alpha * se_diff
    diff_high = diff + z_alpha * se_diff
    rel = (diff / p1) if p1 > 0 else None

    # Required sample size per arm to detect this effect at 80% power.
    required = None
    if p1 != p2 and 0 < p1 < 1 and 0 < p2 < 1:
        z_beta = scipy_stats.norm.ppf(0.8)
        avg_p = (p1 + p2) / 2
        numerator = (
            z_alpha * np.sqrt(2 * avg_p * (1 - avg_p))
            + z_beta * np.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
        ) ** 2
        denom = (p2 - p1) ** 2
        required = int(np.ceil(numerator / denom))

    notes = [
        "Uses pooled standard error for the test, unpooled (Wald) for per-arm CIs.",
        "Small samples (np or n(1-p) < 5) may need an exact test instead.",
    ]
    if required is not None:
        if required > max(n1, n2):
            notes.append(
                f"You'd need ~{required} per arm to detect this effect at 80% power."
            )
        else:
            notes.append("Sample sizes are sufficient to detect this effect at 80% power.")

    return ABResponse(
        test="two-proportion-z",
        alpha=body.alpha,
        control=ABArmSummary(
            name=body.control.name, n=n1, metric=p1,
            std_or_se=se1, ci_low=max(0.0, ci1[0]), ci_high=min(1.0, ci1[1]),
        ),
        variant=ABArmSummary(
            name=body.variant.name, n=n2, metric=p2,
            std_or_se=se2, ci_low=max(0.0, ci2[0]), ci_high=min(1.0, ci2[1]),
        ),
        diff_absolute=float(diff),
        diff_relative=float(rel) if rel is not None else None,
        diff_ci_low=float(diff_low),
        diff_ci_high=float(diff_high),
        test_statistic=float(z_stat),
        df=None,
        p_value=p_value,
        significant=bool(p_value < body.alpha),
        interpretation=_interpret_ab(diff, rel, p_value, body.alpha, body.control.name, body.variant.name),
        required_sample_size_per_arm=required,
        notes=notes,
    )


@app.post("/vrp/solve", response_model=VRPResponse)
def vrp_solve(request: Request, body: VRPRequest) -> VRPResponse:
    """Capacitated VRP solver — Clarke-Wright savings + per-route 2-opt."""
    _get_paths(request)
    depot = body.depot
    customers = body.customers
    n = len(customers)

    chosen, unserved, _full_dist = _vrp_savings(
        depot, customers, body.num_vehicles, body.vehicle_capacity
    )

    # Within each route, run 2-opt with depot at both ends.
    routes_out = []
    total_distance = 0.0
    total_load = 0.0
    for vehicle_idx, (cust_indices, load) in enumerate(chosen):
        if not cust_indices:
            continue
        route_points = [depot] + [
            Point(name=customers[i].name, x=customers[i].x, y=customers[i].y)
            for i in cust_indices
        ] + [depot]
        dist = _distance_matrix(route_points)
        seq = list(range(len(route_points)))
        # 2-opt over the interior only (keep depot at start and end).
        improved = True
        max_iter = 200
        it = 0
        while improved and it < max_iter:
            improved = False
            it += 1
            for i in range(1, len(seq) - 2):
                for j in range(i + 1, len(seq) - 1):
                    candidate = seq[:i] + seq[i:j + 1][::-1] + seq[j + 1:]
                    if _route_length(candidate, dist, False) < _route_length(seq, dist, False) - 1e-9:
                        seq = candidate
                        improved = True
        leg_distance = _route_length(seq, dist, False)
        total_distance += leg_distance
        total_load += load
        names = [route_points[k].name or "depot" if k in (0, len(route_points) - 1) else (route_points[k].name or f"#{k}") for k in seq]
        coords = [[route_points[k].x, route_points[k].y] for k in seq]
        # Map sequence back to customer indices in the original list (-1 for depot)
        cust_seq = [(-1 if k == 0 or k == len(route_points) - 1 else cust_indices[k - 1]) for k in seq]
        routes_out.append(VRPRoute(
            vehicle=vehicle_idx + 1,
            sequence=cust_seq,
            names=names,
            coordinates=coords,
            distance=float(leg_distance),
            load=float(load),
        ))

    return VRPResponse(
        routes=routes_out,
        total_distance=float(total_distance),
        total_load=float(total_load),
        unserved=unserved,
        vehicle_capacity=body.vehicle_capacity,
        method="clarke-wright + per-route 2-opt",
    )
