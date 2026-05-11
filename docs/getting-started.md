# Getting Started

This guide walks you through signing up for RINK, uploading your first dataset,
training a model, and generating a forecast — all in about five minutes.

## 1. Create an account

Go to [rinkglobal.com](https://rinkglobal.com) and click **Get Started** in the
top-right (or follow the [direct link to the registration form](https://rinkglobal.com/auth?mode=register)).

Fill in:

- **First and last name** — used for personalised greetings and the avatar initials.
- **Email** — must be a real address; we send a confirmation link.
- **Phone (optional)** — saved on your profile, never shared.
- **Password** — at least 8 characters. The strength meter updates live.

After you submit, check your inbox for a confirmation email. Click the link
and you'll be redirected back to RINK and signed in automatically.

> **Tip.** If you don't see the email, check spam, then click *Resend
> confirmation email* on the page.

## 2. Open the workspace

Once signed in, click **Workspace** in the navbar — or go directly to
[rinkglobal.com/analytics](https://rinkglobal.com/analytics).

You'll see four KPI cards across the top: **Dataset rows**, **Cadence**,
**RMSE**, and **MAE**. They start as `—` until you upload data.

## 3. Upload a dataset

In the left column, find the **Upload Dataset** card and either:

- Drag a CSV file onto the dotted box, or
- Click the box to open a file picker.

Constraints:

- File type: `.csv`
- Size: up to **10 MB**
- Must contain at least one numeric column

When you click **Upload & Train**, RINK does three things:

1. **Auto-detects a date column.** Looks for `date`, `timestamp`, `time`,
   `datetime`, `ds`, or `period` (any case). Falls back to scanning string
   columns for parseable dates.
2. **Sorts ascending.** If your data is reverse-chronological, RINK reorders
   it so the most recent row is last.
3. **Auto-trains** a gradient-boosting model and reports RMSE / MAE.

You'll see a green toast confirming success and the chart populates with
your time series.

## 4. Switch columns (optional)

If your CSV has multiple numeric columns, the **Model** card shows them as
emerald pills (or a dropdown if there are more than six). Click a different
column and RINK refetches the data, retrains the model, and updates the
chart automatically.

The selection is saved per-browser, so reloading the page keeps you on the
same column.

## 5. Generate a forecast

In the **Generate Forecast** card:

1. Pick a **horizon** (5, 10, 14, or 30 — labelled in the inferred unit:
   "10 weeks", "14 days", etc).
2. The **Most recent values** box auto-fills with the last *N* values from
   your dataset. You can edit them or click **Use last N** to refill.
3. Click **Generate &lt;N&gt;-&lt;unit&gt; Forecast**.

The forecast appears as:

- A **dashed green line** on the main chart, starting from "now".
- A **shaded green band** around it — the confidence interval (±RMSE,
  widening with horizon).
- A row of **forecast tiles** showing the predicted date and value for
  each step.

## 6. Save and re-forecast as you like

Your data and trained model are saved on the server under your account. As
long as you stay signed in, you can:

- Switch columns and re-train at will.
- Generate as many forecasts as you want.
- Reload the page; everything is restored.

Files are deleted automatically when you sign out (or after 4 hours of
inactivity). To keep your dataset, simply stay signed in.

## What's next?

- Read the [Forecasting guide](/guides/forecasting) for a deeper look at
  how recursive prediction and confidence bands work.
- Browse the [API Reference](/api/) if you want to drive RINK programmatically.
- Skim the [FAQ](/faq) for answers to the most common questions.
