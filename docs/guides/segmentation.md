# Customer Segmentation

Find natural groups in a customer table. Trains a K-means model, projects
the result to two dimensions for visualization, and produces per-segment
profiles in your original feature units.

## Quick start

1. Open **Tools → Customer Segmentation** (`/tools/segmentation`).
2. Drop a CSV where each row is a customer.
3. Leave **Auto-pick the number of segments** checked, or set it manually
   with the slider.
4. Click **Find segments**.

## How feature selection works

By default RINK uses every numeric column except obvious row identifiers
(anything ending in `_id` or named `id` / `index`). You can override with
the **Feature columns** input — supply a comma-separated list:

```
recency, total_spend, tenure_months
```

Non-numeric columns are silently skipped. If you reference a column that
doesn't exist in the CSV, the request fails with a helpful 400.

## How it works

1. **Standardise** features with `StandardScaler` so columns at different
   scales (e.g. age in years vs spend in dollars) get equal weight.
2. **Pick `k` automatically** by trying values 2 through 8 and selecting
   the one with the highest silhouette score. Or use the manual value.
3. **Fit K-means** with `n_init=10` for robustness against random init.
4. **Project to 2D** with PCA so the result can be plotted.
5. **Report centroids in original units** (inverse-transformed from
   standardised space) so the profile cards are interpretable.

## Reading the output

- **Silhouette score** — how well-separated the segments are.
  - ≤ 0 → no real structure, segments are arbitrary.
  - 0.1–0.3 → weak but real grouping.
  - 0.3–0.5 → solid segmentation.
  - ≥ 0.5 → strong, very distinct segments.
- **Segment map** — PCA scatter, colour-coded. Tightly grouped colours
  with clear gaps between them indicate good segmentation.
- **Segment profiles** — for each segment, the size + percentage + average
  values across your features. The header label ("High recency", "High
  total_spend", etc.) is RINK's guess at the segment's defining trait.

## Limits

- 12-segment cap (sliding past it produces too many tiny groups).
- 20-row minimum.
- Need at least 2 numeric feature columns.

## API

`POST /api/segmentation/run` (multipart/form-data)

| Field      | Type   | Default                | Description                              |
| ---------- | ------ | ---------------------- | ---------------------------------------- |
| `file`     | file   | —                      | CSV, ≤ 10 MB                             |
| `k`        | int    | auto (silhouette)      | Force a specific number of segments      |
| `features` | string | auto-detect numerics   | Comma-separated feature columns to use   |

Returns:

```json
{
  "n_clusters": 4,
  "rows": 1234,
  "features_used": ["recency", "spend", "tenure"],
  "silhouette": 0.412,
  "inertia": 5421.3,
  "auto_k": true,
  "clusters": [
    { "id": 0, "size": 312, "pct": 0.253, "centroid": { "recency": …, "spend": … }, "label": "High spend" },
    …
  ],
  "points": [
    { "index": 0, "cluster": 2, "x": 0.51, "y": -0.33 },
    …
  ]
}
```
