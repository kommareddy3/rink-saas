# Uploading data

RINK accepts comma-separated values (`.csv`) files up to **10 MB**. There's
no minimum row count for upload, but you'll need at least 30 rows of valid
numeric data to train a model.

## File requirements

| Requirement       | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| Format            | `.csv` (UTF-8 recommended)                             |
| Size              | ≤ 10 MB                                                |
| Header row        | Required — first row is treated as column names         |
| At least one      | Numeric column                                         |
| Recommended       | A date / timestamp column                              |

If a non-CSV file is selected, the upload zone rejects it client-side
before any bytes leave your browser. The same check is repeated on the
gateway and the ML service.

## Date column detection

When you upload, RINK looks for a date column in this order:

1. **Named columns:** `date`, `timestamp`, `time`, `datetime`, `ds`,
   `period` — case-insensitive variants like `Date`, `DATE` are also
   matched.
2. **Parseable strings:** any object-typed column where ≥60% of the first
   20 sampled values parse as a date.

If a date column is found, RINK:

- **Sorts the rows ascending** by date. Reverse-chronological CSVs are
  reordered, so "most recent" always means the last row after upload.
- **Infers the cadence** from the median delta between consecutive
  timestamps. Buckets: daily / weekly / monthly / quarterly / yearly,
  or `every X days` for irregular series.

If no date column is found, rows are processed in the order they appear in
the file and the cadence shows as *unknown*. You can still train and
forecast, but step semantics fall back to "+1, +2, +3, …" instead of real
future dates.

## Numeric column detection

After excluding the date column, RINK collects all numeric columns. The
first match wins from a preference list:

```
value, y, target, close, price, pmms30
```

If none of these are present, the **first numeric column in CSV order** is
used.

You can override the auto-detection at any time using the column picker in
the **Model** card — see [Switching columns](#switching-columns) below.

## What happens after upload

1. The file is forwarded to the ML service (which streams it to disk under
   `/var/data/users/<your_uuid>/uploaded.csv`).
2. The model auto-trains. Status toast: *"Trained on N rows · weekly
   cadence · RMSE … · MAE …"*
3. The chart and KPIs refresh. The prediction input pre-fills with the
   most recent N values.

Subsequent re-uploads **replace** the previous file and model.

## Switching columns

If your CSV has multiple numeric columns, the **Model** card shows them
all:

- **2–6 columns** — emerald pill buttons.
- **7+ columns** — a `<select>` dropdown.

Picking a different column atomically:

1. Refetches `/api/data?column=NAME`.
2. Calls `/api/train` with `{ "column": "NAME" }`.
3. Clears stale predictions.

The selection is saved to `localStorage` so it persists across reloads.
Uploading a new CSV clears the saved choice.

## Storage and cleanup

- Each user's data is isolated under `/var/data/users/<user_id>/` — other
  users **cannot** see or access your data.
- Files are deleted automatically when you sign out (manual or after the
  4-hour idle timeout).
- There is currently no batch-export feature; copy your forecast values
  out of the workspace if you want them after sign-out.

## Limits

| Property                 | Limit       |
| ------------------------ | ----------- |
| File size                | 10 MB       |
| Server-stored data per user | One CSV at a time (replaces on re-upload) |
| Min rows to train        | 30 (after feature dropping) |
| Concurrent users on Render Starter | ~50 lightly active |
