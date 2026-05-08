"""
RINK Global Services - ML Forecasting Service
==============================================

FastAPI service that exposes time-series training and recursive
multi-step forecasting endpoints. The model uses engineered lag and
rolling-window features fed into a Gradient Boosting regressor.

Endpoints:
  GET  /health      Liveness probe
  POST /upload      Accept a CSV file (multipart) and persist it
  POST /train       Train the model on the persisted CSV
  POST /predict     Recursively forecast `steps` future values from `values`
  GET  /data        Return the most recent N values from the persisted CSV
"""

from __future__ import annotations

import io
import logging
import os
from pathlib import Path
from typing import List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
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
DATA_DIR.mkdir(parents=True, exist_ok=True)

DATASET_PATH = DATA_DIR / "uploaded.csv"
MODEL_PATH = DATA_DIR / "model.joblib"
META_PATH = DATA_DIR / "meta.joblib"

# CSV column auto-detection: prefer these names if present, otherwise
# fall back to the first numeric column in the file.
PREFERRED_VALUE_COLUMNS = [
    "value", "y", "target", "close", "price", "pmms30",
]

LAGS = [1, 2, 3, 5, 7]
ROLLING_WINDOWS = [3, 7]
MIN_TRAIN_ROWS = 30  # need enough history for features + train/val split

ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5001,http://localhost:5173",
    ).split(",")
    if o.strip()
]

# ---------------------------------------------------------------------------
# App + CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="RINK ML Service", version="1.0.0")

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
    steps: int = Field(5, ge=1, le=200)


class TrainResponse(BaseModel):
    status: str
    rows_used: int
    column: str
    rmse: float
    mae: float


class PredictResponse(BaseModel):
    predictions: List[float]


class DataResponse(BaseModel):
    column: str
    data: List[float]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _detect_value_column(df: pd.DataFrame) -> str:
    for col in PREFERRED_VALUE_COLUMNS:
        if col in df.columns:
            return col
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        raise HTTPException(
            status_code=400,
            detail="CSV has no numeric columns to forecast on.",
        )
    return numeric_cols[0]


def _build_features(series: pd.Series) -> pd.DataFrame:
    """Build lag + rolling features from a 1-D numeric series."""
    df = pd.DataFrame({"y": series.values})
    for lag in LAGS:
        df[f"lag{lag}"] = df["y"].shift(lag)
    for w in ROLLING_WINDOWS:
        df[f"rmean{w}"] = df["y"].shift(1).rolling(w).mean()
    return df.dropna().reset_index(drop=True)


def _features_from_history(history: List[float]) -> np.ndarray:
    """Build a single feature row from the most recent history."""
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


def _load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="No dataset uploaded yet. POST a CSV to /upload first.",
        )
    try:
        df = pd.read_csv(DATASET_PATH)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {exc}")
    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV is empty.")
    return df


def _save_model(model: GradientBoostingRegressor, column: str) -> None:
    joblib.dump(model, MODEL_PATH)
    joblib.dump({"column": column}, META_PATH)


def _load_model() -> tuple[GradientBoostingRegressor, str]:
    if not MODEL_PATH.exists() or not META_PATH.exists():
        raise HTTPException(
            status_code=409,
            detail="Model has not been trained yet. POST to /train first.",
        )
    model = joblib.load(MODEL_PATH)
    meta = joblib.load(META_PATH)
    return model, meta["column"]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "dataset_loaded": DATASET_PATH.exists(),
        "model_trained": MODEL_PATH.exists(),
    }


@app.post("/upload")
async def upload(file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > 50 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 50MB).")

    # Validate the CSV parses before persisting
    try:
        pd.read_csv(io.BytesIO(contents))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid CSV: {exc}")

    DATASET_PATH.write_bytes(contents)
    log.info("Stored uploaded dataset (%d bytes) at %s", len(contents), DATASET_PATH)
    return {"status": "uploaded", "bytes": len(contents), "path": str(DATASET_PATH)}


@app.post("/train", response_model=TrainResponse)
def train() -> TrainResponse:
    df = _load_dataset()
    column = _detect_value_column(df)
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

    # Hold out the last 20% as a validation set
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

    _save_model(model, column)
    log.info("Trained on %d rows (col=%s) RMSE=%.4f MAE=%.4f", len(feats), column, rmse, mae)

    return TrainResponse(
        status="trained",
        rows_used=len(feats),
        column=column,
        rmse=rmse,
        mae=mae,
    )


@app.post("/predict", response_model=PredictResponse)
def predict(data: InputData) -> PredictResponse:
    model, _column = _load_model()

    history = list(data.values)
    predictions: List[float] = []

    for _ in range(data.steps):
        x = _features_from_history(history)
        yhat = float(model.predict(x)[0])
        predictions.append(yhat)
        history.append(yhat)

    return PredictResponse(predictions=predictions)


@app.get("/data", response_model=DataResponse)
def get_data(limit: int = 100) -> DataResponse:
    if not DATASET_PATH.exists():
        # Fallback so the dashboard renders something on a fresh deploy
        return DataResponse(column="demo", data=[7.1, 7.2, 7.3, 7.4, 7.5])

    df = pd.read_csv(DATASET_PATH)
    column = _detect_value_column(df)
    series = pd.to_numeric(df[column], errors="coerce").dropna().tail(max(1, min(limit, 5000)))
    return DataResponse(column=column, data=series.astype(float).tolist())
