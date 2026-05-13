# Churn Prediction

Score which customers are likely to leave. Trains a binary classifier on
historical customer features + an outcome label.

## Quick start

1. Open **Tools → Churn Prediction** (`/tools/churn`).
2. Drop a CSV where each row is a customer and one column is the churn
   label (`0`/`1`, `yes`/`no`, etc).
3. (Optional) Specify the label column name.
4. Click **Train & predict**.

## CSV requirements

- At least 30 rows.
- At least 5 churned and 5 retained customers.
- A column called `churn`, `label`, or `target` — or any column with only
  0/1 / yes/no values, which RINK auto-detects.
- Numeric feature columns are used as-is.
- String columns with ≤ 20 unique values are one-hot encoded.
- High-cardinality strings (customer IDs, names) are ignored automatically.

## How it works

RINK fits a `RandomForestClassifier` with 300 trees, max depth 8. The
data is split 80/20 stratified by the label; the held-out 20% is used to
compute accuracy, AUC, and the confusion matrix.

The trained model then scores **every** row in your dataset for the
"top at-risk customers" list.

## Reading the output

- **Accuracy** — fraction of test-set predictions that were correct.
- **AUC** — area under the ROC curve. 0.5 = random; 1.0 = perfect.
- **Feature importance** — which signals the model relies on most.
- **Risk buckets** — high (probability ≥ 0.70), medium (≥ 0.40), low.
- **Top at-risk** — 10 highest-probability customers with their feature
  values inline.

## API

`POST /api/churn/predict` (multipart/form-data)

| Field   | Type   | Default     | Description                |
| ------- | ------ | ----------- | -------------------------- |
| `file`  | file   | —           | CSV, ≤ 10 MB               |
| `label` | string | auto-detect | Name of the label column   |

Returns `{ accuracy, auc, feature_importance, risk_distribution, confusion,
top_at_risk: [...] }`.
