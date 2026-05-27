"""Synthetic CSV builders shared across the test suite."""
from __future__ import annotations

import numpy as np
import pandas as pd


def single_series_csv(n: int = 400, start: str = "2020-01-01") -> bytes:
    """A clean daily single series with a trend + seasonality, plus an extra
    numeric column and a low-cardinality categorical (an ID candidate that does
    NOT make the data panel, because the dates stay unique)."""
    dates = pd.date_range(start, periods=n, freq="D")
    t = np.arange(n)
    rng = np.random.default_rng(7)
    value = 100 + 0.3 * t + 8 * np.sin(2 * np.pi * t / 30) + rng.normal(0, 2, n)
    sales = 50 + 0.1 * t + rng.normal(0, 1, n)
    region = np.array(["north", "south", "east"])[t % 3]
    df = pd.DataFrame({
        "date": dates.strftime("%Y-%m-%d"),
        "value": value.round(3),
        "sales": sales.round(3),
        "region": region,
    })
    return df.to_csv(index=False).encode()


def panel_csv(per_city: int = 200, start: str = "2021-01-01") -> bytes:
    """Panel data: one temperature row per city per day, shuffled to confirm
    the service re-sorts. (date, city) is unique; dates repeat across cities."""
    cities = ["Detroit", "Austin", "Seattle"]
    frames = []
    rng = np.random.default_rng(11)
    dates = pd.date_range(start, periods=per_city, freq="D")
    t = np.arange(per_city)
    for i, c in enumerate(cities):
        temp = 60 + 10 * i + 12 * np.sin(2 * np.pi * t / 365) + rng.normal(0, 1.5, per_city)
        frames.append(pd.DataFrame({
            "day": dates.strftime("%Y-%m-%d"),
            "city": c,
            "temp": temp.round(2),
        }))
    df = pd.concat(frames, ignore_index=True)
    return df.sample(frac=1, random_state=3).to_csv(index=False).encode()


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------

def anomaly_csv(n: int = 150, n_anomalies: int = 6, start: str = "2022-01-01",
                seed: int = 5) -> bytes:
    """A smooth daily series with a handful of large injected spikes."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range(start, periods=n, freq="D")
    t = np.arange(n)
    value = 50 + 5 * np.sin(2 * np.pi * t / 14) + rng.normal(0, 0.8, n)
    # Inject clear anomalies far from the local context (only when there's room;
    # small n is used to exercise the "too few rows" rejection path).
    lo, hi = 10, n - 10
    if hi > lo and n_anomalies > 0:
        idx = rng.choice(np.arange(lo, hi), size=min(n_anomalies, hi - lo), replace=False)
        value[idx] += rng.choice([-1, 1], size=len(idx)) * rng.uniform(18, 30, size=len(idx))
    df = pd.DataFrame({"date": dates.strftime("%Y-%m-%d"), "value": value.round(3)})
    return df.to_csv(index=False).encode()


# ---------------------------------------------------------------------------
# Churn Prediction
# ---------------------------------------------------------------------------

def churn_csv(n: int = 240, seed: int = 13) -> bytes:
    """Customer table with numeric + categorical features and a 0/1 'churn'
    label that genuinely correlates with the features (so AUC > 0.5)."""
    rng = np.random.default_rng(seed)
    tenure = rng.integers(1, 72, n)
    monthly_charges = rng.uniform(20, 120, n).round(2)
    support_tickets = rng.poisson(2, n)
    plan = rng.choice(["basic", "pro", "enterprise"], n, p=[0.5, 0.35, 0.15])
    # churn more likely with low tenure, high charges, many tickets
    logit = (
        -0.05 * tenure
        + 0.02 * monthly_charges
        + 0.35 * support_tickets
        - 1.0
    )
    prob = 1 / (1 + np.exp(-logit))
    churn = (rng.random(n) < prob).astype(int)
    df = pd.DataFrame({
        "customer_id": [f"C{100000 + i}" for i in range(n)],  # high-card → skipped
        "plan": plan,                                          # low-card → one-hot
        "tenure": tenure,
        "monthly_charges": monthly_charges,
        "support_tickets": support_tickets,
        "churn": churn,
    })
    return df.to_csv(index=False).encode()


def churn_csv_no_features(n: int = 60, seed: int = 1) -> bytes:
    """Only a label + a high-cardinality id — no usable feature columns."""
    rng = np.random.default_rng(seed)
    df = pd.DataFrame({
        "customer_id": [f"C{i}" for i in range(n)],
        "churn": (rng.random(n) < 0.4).astype(int),
    })
    return df.to_csv(index=False).encode()


# ---------------------------------------------------------------------------
# Customer Segmentation
# ---------------------------------------------------------------------------

def segmentation_csv(n_per: int = 60, seed: int = 21) -> bytes:
    """Three well-separated Gaussian blobs across 3 numeric features, plus an
    id column (which the service should drop) — n = 3 * n_per rows."""
    rng = np.random.default_rng(seed)
    centers = [(200, 5, 60), (1500, 40, 10), (700, 18, 30)]
    rows = []
    for ci, (spend, visits, recency) in enumerate(centers):
        for _ in range(n_per):
            rows.append({
                "annual_spend": float(rng.normal(spend, 40)),
                "visits": float(max(0, rng.normal(visits, 2))),
                "recency_days": float(max(0, rng.normal(recency, 4))),
            })
    df = pd.DataFrame(rows)
    df.insert(0, "customer_id", [f"U{i}" for i in range(len(df))])  # *_id → dropped
    return df.sample(frac=1, random_state=seed).to_csv(index=False).encode()


# ---------------------------------------------------------------------------
# TSP / VRP — JSON payload builders (these endpoints take JSON, not CSV)
# ---------------------------------------------------------------------------

def tsp_points(n: int = 12, seed: int = 7):
    rng = np.random.default_rng(seed)
    pts = rng.uniform(0, 100, size=(n, 2)).round(2)
    return [{"name": f"Stop {i}", "x": float(x), "y": float(y)}
            for i, (x, y) in enumerate(pts)]


def vrp_payload(n_customers: int = 9, capacity: float = 15, num_vehicles: int = 3,
                demand: float = 3, seed: int = 9):
    rng = np.random.default_rng(seed)
    pts = rng.uniform(0, 100, size=(n_customers, 2)).round(2)
    return {
        "depot": {"name": "Depot", "x": 50.0, "y": 50.0},
        "customers": [
            {"name": f"C{i}", "x": float(x), "y": float(y), "demand": demand}
            for i, (x, y) in enumerate(pts)
        ],
        "num_vehicles": num_vehicles,
        "vehicle_capacity": capacity,
    }


# ---------------------------------------------------------------------------
# A/B test — JSON payload builders
# ---------------------------------------------------------------------------

def ab_continuous_payload(n: int = 80, control_mean: float = 10.0,
                          variant_mean: float = 11.5, sd: float = 2.0, seed: int = 3):
    rng = np.random.default_rng(seed)
    return {
        "control": {"name": "A", "values": rng.normal(control_mean, sd, n).round(3).tolist()},
        "variant": {"name": "B", "values": rng.normal(variant_mean, sd, n).round(3).tolist()},
        "alpha": 0.05,
    }


def ab_conversion_payload(n1: int = 2000, c1: int = 200, n2: int = 2000, c2: int = 260):
    return {
        "control": {"name": "A", "visitors": n1, "conversions": c1},
        "variant": {"name": "B", "visitors": n2, "conversions": c2},
        "alpha": 0.05,
    }
