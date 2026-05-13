# Tools overview

Beyond forecasting, RINK includes four additional ML / optimization tools
that share the same authentication, per-user file handling, and visual
language.

| Tool                                  | Best for                                                       |
| ------------------------------------- | -------------------------------------------------------------- |
| [Forecasting](./forecasting)          | Predicting future values of a time series                      |
| [Anomaly Detection](./anomaly)        | Flagging unusual rows for fraud / fault detection              |
| [Churn Prediction](./churn)           | Scoring which customers are likely to leave                    |
| [Customer Segmentation](./segmentation) | Clustering customers into natural groups (K-means)            |
| [A/B Test Analyzer](./abtest)         | Statistical significance for continuous or conversion experiments |
| [TSP](./tsp)                          | Single-vehicle shortest route through N locations              |
| [Vehicle Routing](./vrp)              | Multi-vehicle fleet planning with capacity constraints         |

All tools are accessible from the **Tools** dropdown in the navbar once
you're signed in.

## Common patterns

- **Inputs**: most tools accept a CSV (≤ 10 MB) drag-and-dropped into the
  workspace. TSP and VRP accept tabular text input instead, so you can
  paste coordinates directly.
- **Outputs**: every tool renders KPIs at the top, a primary visualisation
  in the centre, and tool-specific detail tables / lists below.
- **Privacy**: uploaded data is stored under your user directory and
  deleted on sign-out (manual or after the 4-hour idle timeout).
- **Auth**: every tool's API requires a valid Supabase access token; the
  client attaches it automatically via the `api.js` interceptor.
