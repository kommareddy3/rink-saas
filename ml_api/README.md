# RINK ML service

FastAPI service that powers forecasting, anomaly detection, churn
prediction, segmentation, A/B testing, and route optimization for the RINK
platform. Deployed to Render.

## Local development — always work in a venv

This project pins specific versions of `numpy`, `cryptography`, etc. that
can conflict with other tools you may have installed globally
(`streamlit`, `numba`, `pyopenssl`, …). **Develop inside a virtualenv so
those don't fight each other.**

```bash
cd ml_api
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate

pip install -r requirements.txt -r requirements-dev.txt
pytest                            # runs the 66-test suite

uvicorn main:app --reload         # runs the service on http://localhost:8000
```

`.venv/` is in `.gitignore`, so it stays local. To leave the venv:
`deactivate`.

If you ever see pip complain about `cryptography`, `numpy`, or
`protobuf` conflicting with `pyopenssl`, `numba`, or `streamlit`, you're
in the wrong env — `source .venv/bin/activate` first.

## Configuration

See [`../docs/api/ml-service.md`](../docs/api/ml-service.md) for the full
list of environment variables (`RINK_DATA_DIR`, `RINK_ENCRYPTION_KEY`,
`GATEWAY_SECRET`, `ALLOWED_ORIGINS`).

## Tests

```bash
pytest                # all 66 tests
pytest tests/test_forecasting.py -q
pytest -k encryption  # match by name
```

The suite is organised by feature: `test_encryption.py`, `test_scanning.py`,
`test_analyze.py`, `test_forecasting.py`, `test_anomaly.py`, `test_churn.py`,
`test_segmentation.py`, `test_abtest.py`, `test_routing.py`.

## Deploy

Render auto-deploys on push to `main` once the GitHub Actions CI gate
(pytest + client build + e2e) goes green. See
[`../docs/deployment.md`](../docs/deployment.md).
