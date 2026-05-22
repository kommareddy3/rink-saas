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
