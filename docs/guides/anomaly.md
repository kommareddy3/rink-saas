# Anomaly Detection

Flag rows that look out of distribution. Useful for spotting fraud, sensor
malfunctions, surprise sales spikes, or whatever else "doesn't look like
the rest of my data".

## Quick start

1. Open **Tools → Anomaly Detection** (or `/tools/anomaly`).
2. Drop a CSV with at least one numeric column.
3. (Optional) Pick the value column to score and adjust the expected
   anomaly rate slider — defaults to 5%.
4. Click **Detect anomalies**.

## How it works

RINK fits a scikit-learn
[`IsolationForest`](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html)
on lag-augmented features:

| Feature   | Definition                                          |
| --------- | --------------------------------------------------- |
| `y`       | The value itself                                    |
| `lag1`    | Previous row's value                                |
| `lag2`    | Two rows back                                       |
| `rmean5`  | Rolling mean of the previous 5 rows                  |
| `rstd5`   | Rolling std of the previous 5 rows                   |

Including lag features means anomalies are scored **relative to local
context** — a value of 100 isn't anomalous if it follows a series of
similar values, but is if it follows a series of 10s.

The `contamination` slider sets the expected fraction of anomalies. A
contamination of 5% means roughly 5% of rows will be flagged regardless
of how the actual data looks. Tune based on your domain knowledge.

## Reading the output

- **Anomaly rate** — what fraction of rows were flagged. Should be close
  to the contamination you set.
- **Threshold score** — the cutoff value separating normal from anomalous.
- **Series chart** — your values plotted in time. Flagged points
  highlighted in red.
- **Top anomalies table** — flagged rows ranked by score (highest first).

## API

`POST /api/anomaly/detect` (multipart/form-data)

| Field          | Type   | Default       | Description                       |
| -------------- | ------ | ------------- | --------------------------------- |
| `file`         | file   | —             | CSV, ≤ 10 MB                      |
| `column`       | string | auto-detect   | Numeric column to score           |
| `contamination`| number | 0.05          | Expected anomaly fraction (0.001–0.5) |

Returns `{ column, rows, anomalies, anomaly_rate, threshold, points: [...] }`.
