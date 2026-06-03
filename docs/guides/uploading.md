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

> 🔒 **Your file is encrypted and scanned.** Before anything is stored, the
> ML service scans the upload (format guard + VirusTotal) and rejects
> binaries, archives, executables, malware, and anything that isn't plain-text
> CSV. Accepted files are then **encrypted at rest** — the plaintext CSV never
> reaches storage. Full details on the [Security](/security) page.

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

## Panel / grouped data

Some datasets carry **many rows per date** — for example temperature per
city per day, or sales per store per week. This is called *panel* (or
*grouped*) data, and forecasting it as one blended series gives poor
results because several independent series are interleaved.

RINK detects this automatically. When it sees repeating dates plus a
low-cardinality categorical column (an **ID / group column**) that makes
each `(date, group)` pair unique, it:

- Flags the dataset as panel data and **suggests the group column**
  (e.g. `city`).
- Lists the available groups (e.g. `Detroit`, `Austin`, `Seattle`).
- Shows a hint: *"Multiple rows share the same date — pick one group to
  forecast a single, clean series."*

A **Training Scope** card then appears in the workspace with a group
picker. Choose a group and click **Apply & Re-train** to forecast that one
series. Leaving it on *All groups* trains on the combined data.

This profiling is exposed via the [`/api/analyze`](/api/gateway#post-api-analyze-🔒)
endpoint, which also reports `date_min` / `date_max` and an
`encryption_at_rest` flag.

## What happens after upload

1. The file is forwarded to the ML service, which **virus-scans** it
   (VirusTotal), **encrypts** it, and stores it under
   `users/<your_uuid>/uploaded.csv` in object storage (Cloudflare R2, or a
   local-disk fallback).
2. The model auto-trains. Status toast: *"Trained on N rows · weekly
   cadence · RMSE … · MAE …"*
3. The chart and KPIs refresh. The prediction input pre-fills with the
   most recent N values.

## Your file library

Every file you upload is kept in your encrypted **file library** in the
bucket — uploading a new file no longer discards the previous one. The newest
upload becomes the **active** dataset that the tools analyze.

From the **My data** panel in the workspace (and in your Profile) you can:

- See every file you've uploaded (name, size, row count, date) and which is active.
- **Use for analysis** — switch the active dataset to any stored file (re-trains automatically).
- **Delete** a single file, all files, or everything (files + reports) at once.

Files are retained for up to **90 days**, then auto-deleted; you can delete
sooner anytime.

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

- Your CSV is **virus-scanned then encrypted** before it reaches storage
  (when an encryption key is configured — always on in production). See
  [Security → encryption at rest](/security#encryption-at-rest).
- Each user's data is isolated under `users/<user_id>/` — other users
  **cannot** see or access your data.
- Files are retained for up to **90 days** and then deleted automatically.
  You can delete everything sooner from your profile. Signing out does not
  delete your data.
- Forecast values can be exported to CSV from the Forecast Detail card —
  see [the FAQ](/faq#can-i-export-my-forecast-values).

## Limits

| Property                 | Limit       |
| ------------------------ | ----------- |
| File size                | 10 MB       |
| Server-stored data per user | One CSV at a time (replaces on re-upload) |
| Min rows to train        | 30 (after feature dropping) |
| Concurrent users on Render Starter | ~50 lightly active |
