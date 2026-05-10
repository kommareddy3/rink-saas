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
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

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
    steps: int = Field(10, ge=1, le=200)


class TrainRequest(BaseModel):
    column: Optional[str] = None


class TrainResponse(BaseModel):
    status: str
    rows_used: int
    column: str
    available_columns: List[str] = []
    date_column: Optional[str] = None
    frequency: str = "unknown"
    days_per_step: Optional[float] = None
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
    days_per_step: Optional[float] = None


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
    median_seconds = deltas.dt.total_seconds().median()
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

def _load_dataset(paths: UserPaths) -> pd.DataFrame:
    if not paths.dataset.exists():
        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded yet. POST a CSV to /upload first.",
        )
    try:
        df = pd.read_csv(paths.dataset)
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

    try:
        pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")

    paths.ensure_dir()
    paths.dataset.write_bytes(contents)
    log.info("[user=%s] stored dataset (%d bytes)", paths.user_id, len(contents))
    return {"status": "uploaded", "bytes": len(contents)}


@app.post("/train", response_model=TrainResponse)
def train(request: Request, req: TrainRequest = TrainRequest()) -> TrainResponse:
    paths = _get_paths(request)
    df, date_col, frequency, days_per_step = _prepare_dataset(paths)
    excluded = [date_col] if date_col else None
    column = _resolve_value_column(df, paths, requested=req.column, exclude=excluded)
    available = _list_numeric_columns(df, exclude=excluded)

    series = pd.to_numeric(df[column], errors="coerce").dropna()
    if len(series) < MIN_TRAIN_ROWS:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {MIN_TRAIN_ROWS} numeric rows in column '{column}'; got {len(series)}.",
        )

    feats = _build_features(series)
    feature_cols = [c for c in feats.columns if c != "y"]
    X = feats[feature_cols].values
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

    _save_model(
        paths,
        model,
        {
            "column": column,
            "date_column": date_col,
            "frequency": frequency,
            "days_per_step": days_per_step,
        },
    )
    log.info(
        "[user=%s] trained on %d rows (col=%s, date=%s, freq=%s) RMSE=%.4f MAE=%.4f",
        paths.user_id, len(feats), column, date_col, frequency, rmse, mae,
    )

    return TrainResponse(
        status="trained",
        rows_used=len(feats),
        column=column,
        available_columns=available,
        date_column=date_col,
        frequency=frequency,
        days_per_step=days_per_step,
        rmse=rmse,
        mae=mae,
    )


@app.post("/predict", response_model=PredictResponse)
def predict(request: Request, data: InputData) -> PredictResponse:
    paths = _get_paths(request)
    model, _meta = _load_model(paths)
    history = list(data.values)
    predictions: List[float] = []
    for _ in range(data.steps):
        x = _features_from_history(history)
        yhat = float(model.predict(x)[0])
        predictions.append(yhat)
        history.append(yhat)
    return PredictResponse(predictions=predictions)


@app.get("/data", response_model=DataResponse)
def get_data(request: Request, limit: int = 500, column: Optional[str] = None) -> DataResponse:
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
    excluded = [date_col] if date_col else None
    chosen = _resolve_value_column(df, paths, requested=column, exclude=excluded)
    available = _list_numeric_columns(df, exclude=excluded)
    series_raw = pd.to_numeric(df[chosen], errors="coerce")
    mask = series_raw.notna()

    series = series_raw[mask]
    dates_iso: Optional[List[str]] = None
    if date_col:
        dates_iso = df.loc[mask, date_col].dt.strftime("%Y-%m-%d").tolist()

    n = max(1, min(limit, 5000))
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
