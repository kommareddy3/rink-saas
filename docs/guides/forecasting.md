# Generating forecasts

Once a model is trained, click **Generate &lt;N&gt;-&lt;unit&gt; Forecast** in the
**Generate Forecast** card. RINK predicts the next *N* steps using
recursive multi-step forecasting.

## How recursive forecasting works

The model was trained on lag features — given lag1, lag2, lag3, lag5, lag7
and rolling means, predict the next value.

To forecast more than one step ahead, RINK feeds its own predictions back
in as inputs. For each step:

1. Build feature vector from the last 7 values of the running history.
2. Predict the next value.
3. Append that prediction to the history.
4. Repeat for *N* steps.

This means **errors compound with horizon**. A small mistake at step 1
slightly biases step 2, which slightly biases step 3, and so on. RINK
visualises this with a **widening confidence band**:

```
band_low  = prediction − rmse × (1 + i × 0.25)
band_high = prediction + rmse × (1 + i × 0.25)
```

…where *i* is the 0-indexed step number. Step 1's band is ±RMSE; step 5's
is ±2× RMSE; step 10's is ±3.25× RMSE.

> The 0.25 widening factor is a heuristic, not a calibrated interval. It's
> meant as a *visual cue* that further-out forecasts are less certain.
> Treat it that way, not as a true 95% CI.

## Picking a horizon

The horizon picker lets you choose 5, 10, 14, or 30 steps. The label
adapts to the inferred cadence:

- **Daily data** → "10 days"
- **Weekly data** → "10 weeks"
- **Monthly data** → "10 months"
- **Unknown cadence** → "10 steps"

You can request up to **1825 steps** (≈ five years of daily points) via
the API directly — there is no hard 30-day limit. Beyond ~20 steps,
though, the forecast quickly converges to a fixed point because the
recursive feedback dampens out — that's a property of the model, not a
bug, so very long horizons are best read as "trend direction" rather than
precise per-step values.

## Pre-filling the input

The **Most recent values** textarea is auto-populated with the last
`max(7, horizon)` values from your dataset. You can:

- Edit them by hand.
- Click **Use last N** to refill from the current dataset.

Order matters: oldest first, most recent last. RINK uses the **last 7
values you provide** as the lag inputs for step 1, so it's fine to paste
in more than 7 — only the tail is used.

## Reading the chart

After clicking Generate, the chart shows three things:

- **Blue gradient area** — your actual data.
- **Dashed green line with dots** — the forecast.
- **Faint green halo** — the confidence band (toggleable in legend).

A vertical purple **"now"** marker sits at the boundary between actual and
predicted. Anything to the right of it is the model's projection.

The **Forecast Detail** card below shows tile-by-tile values and dates:

```
+1 Apr 23    +2 Apr 30    +3 May 7    +4 May 14    +5 May 21
6.32         6.35         6.37        6.39         6.40
±0.012       ±0.015       ±0.018      ±0.022       ±0.025
```

The bar chart underneath is the same data in bar form for quick magnitude
comparison.

## Date arithmetic for future steps

When a date column is present, future-step labels are computed as:

```
future_date_i = last_actual_date + (i + 1) × days_per_step
```

`days_per_step` comes from the cadence inference:

| Cadence    | days_per_step |
| ---------- | ------------- |
| daily      | 1             |
| weekly     | 7             |
| monthly    | 30            |
| quarterly  | 91            |
| yearly     | 365           |

These are calendar approximations — monthly is exactly 30 days here, not
"same day next month".

## Date-range selector

Above the chart, you can zoom the view to **90D / 1Y / 5Y / All** (or
**100 / 500 / All** rows when there's no date column). The forecast is
still drawn relative to the most recent actual data; only the visible
window of history changes.

The selection is saved to localStorage so reloading the page keeps your
zoom level.

## Forecasts and training scope

A forecast is always based on the **most-recently trained model**, which
reflects whatever [training scope](./training#training-scope-group-window-and-excludes)
was active when you last trained — a single group, a custom date window,
or excluded ranges. If you change the scope, click **Apply & Re-train**
first, then regenerate the forecast so the projection lines up with the
data on screen.

## Forecast vs new training data

Forecasts don't write anything to disk. They're computed on demand from
the most-recently trained model. To incorporate new data into the model:

1. Append the new rows to your CSV.
2. Re-upload the CSV (it replaces the old one and auto-retrains).
3. Re-generate forecasts.

There is no rolling/online learning yet — each upload trains from scratch.
