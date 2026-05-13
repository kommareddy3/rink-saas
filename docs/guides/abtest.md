# A/B Test Analyzer

Decide whether an experiment's variant really beat the control, or
whether the difference is just noise. Two modes: continuous metrics
(revenue, duration) and conversion counts.

## Quick start

1. Open **Tools → A/B Test Analyzer** (`/tools/abtest`).
2. Pick the test type:
   - **Continuous** — comparing means (e.g. revenue per user).
   - **Conversion** — comparing rates (e.g. checkout completion).
3. Fill in the cohort data (or click *Sample* to try with mock data).
4. Click **Run analysis**.

## Continuous mode

Paste numeric values for each arm — comma- or whitespace-separated.
Lines and tabs both work as separators, so you can copy/paste directly
from a spreadsheet.

The test used is **Welch's t-test** (two-sample, unequal variances),
which is robust to unequal variance between groups. Returns:

- Each arm's mean, sample size, standard error, 95% CI.
- Absolute and relative lift (variant vs control).
- 95% CI on the difference.
- t-statistic, degrees of freedom, p-value.

If your data is heavily skewed (e.g. revenue with a long right tail),
Welch's t-test still works reasonably well for n ≥ 30 per arm thanks to
the Central Limit Theorem. For smaller, very non-normal samples, consider
log-transforming or asking us to add Mann-Whitney U.

## Conversion mode

Provide visitor and conversion counts for each arm. The test used is the
**two-proportion z-test**:

- Pooled standard error for the test statistic.
- Unpooled (Wald) standard errors for the per-arm 95% CIs.
- Returns z-statistic, p-value, and the difference in conversion rates
  with its CI.

Additionally, the analyzer estimates the **required sample size per arm
to detect the observed effect at 80% power**. If your current sample is
smaller than that, you've found an effect but the test wasn't powered to
confirm it — recommendation: run longer.

## Reading the verdict

- **Verdict: Significant** — p-value < α. Reject the null hypothesis;
  variant differs from control.
- **Verdict: Not significant** — p ≥ α. Either no real effect or sample
  too small. Look at the required-sample-size estimate (conversion mode)
  to decide whether to keep collecting.

The default α is **0.05**, adjustable via the slider from 0.01 to 0.20.

## Common pitfalls the analyzer doesn't (yet) catch

- **Peeking**: running multiple analyses as data trickles in inflates
  your false-positive rate. Either fix sample size up front or use
  sequential tests.
- **Multiple comparisons**: if you have several metrics, the chance of a
  false positive on at least one of them grows. Apply Bonferroni
  correction (divide α by the number of tests) or pick a single OEC.
- **Novelty / primacy effects**: a variant might win for a week then
  flatten. Plot daily metrics to spot this.
- **Segment effects**: if a variant helps one segment and hurts another,
  the overall result hides the truth. Run by segment.

## API

### `POST /api/abtest/continuous`

```json
{
  "control": { "name": "Control", "values": [12.5, 13.1, ...] },
  "variant": { "name": "Variant", "values": [14.0, 14.5, ...] },
  "alpha": 0.05
}
```

### `POST /api/abtest/conversion`

```json
{
  "control": { "name": "Control", "visitors": 2000, "conversions": 160 },
  "variant": { "name": "Variant", "visitors": 2000, "conversions": 196 },
  "alpha": 0.05
}
```

Both return the same `ABResponse` shape: per-arm summary, diff with CI,
test statistic, p-value, `significant` boolean, and a plain-English
`interpretation`.
