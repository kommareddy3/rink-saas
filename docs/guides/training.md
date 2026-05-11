# Training models

RINK uses a Gradient Boosting Regressor with engineered lag and
rolling-window features. Training happens automatically on upload, and you
can retrain at any time from the **Model** card.

## What a "trained model" means

For each upload (or each column switch), RINK fits a model on engineered
features derived from the value column.

### Features

For a target series `y`, the following features are constructed for each row:

| Feature  | Definition                                          |
| -------- | --------------------------------------------------- |
| `lag1`   | `y` from one period earlier                          |
| `lag2`   | `y` from two periods earlier                          |
| `lag3`   | three periods earlier                                |
| `lag5`   | five periods earlier                                 |
| `lag7`   | seven periods earlier                                |
| `rmean3` | mean of the previous 3 periods (excludes current)    |
| `rmean7` | mean of the previous 7 periods                       |

Rows with any `NaN` in the feature set (the first 7 rows by definition)
are dropped before training. So a 100-row CSV produces ~93 training rows.

### The model

```python
GradientBoostingRegressor(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=3,
    random_state=42,
)
```

These hyperparameters are a sensible default for univariate time series
in the 100–10,000 row range. They're hard-coded in
`ml_api/main.py`; tune them there if you have a specific benchmark in mind.

### Validation split

The feature matrix is split 80/20 chronologically. The first 80% trains
the model; the last 20% is used to compute RMSE and MAE.

This is a **causal split** — no future data leaks into training, which
matches how you'd actually deploy a forecast.

## Reading the metrics

After training, the **RMSE** and **MAE** KPI cards update:

- **RMSE** (root mean-squared error) — penalises large errors more
  heavily; useful when occasional big misses matter.
- **MAE** (mean absolute error) — average error magnitude; easier to
  reason about as "off by X on average".

Both are in the **same units as your value column**. So if your column is
prices in dollars, MAE of `0.18` means "off by 18 cents on average across
the validation set".

## Retraining

Click **Re-train Model** in the Model card to fit a fresh model on the
current dataset. This is useful when:

- You've switched the target column.
- You've replaced the CSV but the column is the same.
- You want to start from a clean random seed (the seed is fixed, but
  re-training clears any in-memory state).

Training time scales linearly with rows. For a typical 1,000-row CSV on
Render Starter, training takes well under a second.

## Persistence

After successful training, three files are written to your user directory:

```
/var/data/users/<your_uuid>/
├── uploaded.csv     # the original CSV, preserved as-is
├── model.joblib     # the fitted GradientBoostingRegressor
└── meta.joblib      # { column, date_column, frequency, days_per_step }
```

The model loads from disk on every prediction request, so you can sign out
and back in (without auto-cleanup, e.g. by upgrading the cleanup-on-logout
setting) and your model would still be available.

> ⚠️ **By default, sign-out wipes these files.** If you want them to
> persist across sessions, see the implementation note in the
> [signOut wrapper](https://github.com/rinkglobal/rink-saas-v3-ml/blob/main/client/src/contexts/AuthContext.jsx).

## When training fails

| Symptom                                                             | Cause                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Need at least 30 numeric rows`                                     | Fewer than 30 valid (non-NaN) values in the target column                 |
| `CSV has no numeric columns`                                        | All columns are strings/empty                                             |
| `Failed to read CSV`                                                | File is corrupt, has unescaped quotes, or uses an unusual delimiter       |
| `Need at least 7 historical values`                                 | Tried to predict with too short an input                                  |
| Training silently picks the wrong column                            | Use the column picker to override; see [Switching columns](./uploading#switching-columns) |
