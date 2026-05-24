"""Forecasting: all data, custom window, exclude ranges, grouped panel data,
plus horizon limits and error handling."""
from .conftest import upload_csv
from .helpers import panel_csv, single_series_csv


def _train(client, headers, **body):
    return client.post("/train", headers=headers, json=body)


def test_train_all_data(make_client):
    client, _main, headers = make_client(user="fcastall0000001")
    upload_csv(client, headers, single_series_csv(n=400))
    r = _train(client, headers)
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "trained"
    assert d["column"] == "value"
    assert d["rows_used"] > 350
    assert d["train_start"] == "2020-01-01"
    assert d["frequency"] == "daily"


def test_data_returns_full_series(make_client):
    client, _main, headers = make_client(user="fcastall0000002")
    upload_csv(client, headers, single_series_csv(n=400))
    d = client.get("/data", headers=headers, params={"limit": 20000}).json()
    assert len(d["data"]) > 350
    assert d["dates"] is not None and len(d["dates"]) == len(d["data"])


def test_predict_horizons(make_client):
    client, _main, headers = make_client(user="fcastpred000001")
    upload_csv(client, headers, single_series_csv(n=400))
    _train(client, headers)
    hist = client.get("/data", headers=headers).json()["data"][-30:]

    r = client.post("/predict", headers=headers, json={"values": hist, "steps": 14})
    assert r.status_code == 200
    assert len(r.json()["predictions"]) == 14

    r2 = client.post("/predict", headers=headers, json={"values": hist, "steps": 365})
    assert len(r2.json()["predictions"]) == 365


def test_predict_horizon_cap(make_client):
    client, _main, headers = make_client(user="fcastcap0000001")
    upload_csv(client, headers, single_series_csv(n=60))
    _train(client, headers)
    hist = client.get("/data", headers=headers).json()["data"][-10:]
    # 1825 is the documented max; above it must be a validation error.
    assert client.post("/predict", headers=headers,
                       json={"values": hist, "steps": 1825}).status_code == 200
    assert client.post("/predict", headers=headers,
                       json={"values": hist, "steps": 2000}).status_code == 422


def test_train_custom_window(make_client):
    client, _main, headers = make_client(user="fcastwin0000001")
    upload_csv(client, headers, single_series_csv(n=400))
    full = _train(client, headers).json()
    win = _train(client, headers, train_start="2020-03-01", train_end="2020-08-31").json()
    assert win["train_start"] == "2020-03-01"
    assert win["train_end"] == "2020-08-31"
    assert win["rows_used"] < full["rows_used"]

    d = client.get("/data", headers=headers,
                   params={"train_start": "2020-03-01", "train_end": "2020-08-31"}).json()
    assert d["dates"][0] >= "2020-03-01"
    assert d["dates"][-1] <= "2020-08-31"


def test_train_exclude_ranges(make_client):
    client, _main, headers = make_client(user="fcastexc0000001")
    upload_csv(client, headers, single_series_csv(n=400))
    full = _train(client, headers).json()
    ex = _train(client, headers, exclude_ranges=[["2020-05-01", "2020-07-31"]]).json()
    assert ex["rows_used"] < full["rows_used"]

    d = client.get("/data", headers=headers, params={"exclude": "2020-05-01:2020-07-31"}).json()
    assert not any("2020-05-15" <= dt <= "2020-07-15" for dt in d["dates"])


def test_grouped_panel_training(make_client):
    client, _main, headers = make_client(user="fcastgrp0000001")
    upload_csv(client, headers, panel_csv(per_city=200))

    g = _train(client, headers, group_column="city", group_value="Austin").json()
    assert g["status"] == "trained"
    assert g["column"] == "temp"          # never the categorical 'city'
    assert g["group_value"] == "Austin"
    assert g["rows_used"] <= 200

    d = client.get("/data", headers=headers,
                   params={"group_column": "city", "group_value": "Seattle"}).json()
    assert d["column"] == "temp"
    assert len(d["data"]) <= 200


def test_panel_no_group_frequency_not_zero(make_client):
    """Regression: duplicate dates must not collapse frequency to 'every 0.0h'."""
    client, _main, headers = make_client(user="fcastfreq000001")
    upload_csv(client, headers, panel_csv(per_city=200))
    d = _train(client, headers).json()
    assert d["frequency"] == "daily"
    assert d["days_per_step"] == 1.0


def test_too_few_rows_after_filter(make_client):
    client, _main, headers = make_client(user="fcasterr0000001")
    upload_csv(client, headers, single_series_csv(n=400))
    r = _train(client, headers, train_start="2020-12-30", train_end="2020-12-31")
    assert r.status_code == 400


def test_bad_group_value(make_client):
    client, _main, headers = make_client(user="fcasterr0000002")
    upload_csv(client, headers, panel_csv(per_city=200))
    r = _train(client, headers, group_column="city", group_value="Nowhere")
    assert r.status_code == 400


def test_predict_before_train(make_client):
    client, _main, headers = make_client(user="fcasterr0000003")
    r = client.post("/predict", headers=headers, json={"values": [1.0] * 10, "steps": 3})
    assert r.status_code == 409


def test_multivariate_training_and_predict(make_client):
    client, _main, headers = make_client(user="fcastmv00000001")
    upload_csv(client, headers, single_series_csv(n=400))  # has 'value' + 'sales'
    r = _train(client, headers, column="value", feature_columns=["sales"])
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "trained"
    assert d["column"] == "value"
    assert d["feature_columns"] == ["sales"]

    # Multivariate predict forecasts from stored data; values are ignored.
    p = client.post("/predict", headers=headers, json={"values": [1.0] * 10, "steps": 12})
    assert p.status_code == 200
    preds = p.json()["predictions"]
    assert len(preds) == 12
    assert all(isinstance(v, (int, float)) for v in preds)


def test_multivariate_drops_invalid_features(make_client):
    client, _main, headers = make_client(user="fcastmv00000002")
    upload_csv(client, headers, single_series_csv(n=120))
    # target itself, a non-existent column, and a categorical are all invalid
    r = _train(client, headers, column="value",
               feature_columns=["value", "nope", "region"])
    assert r.status_code == 200
    assert r.json()["feature_columns"] == []


def test_univariate_after_multivariate(make_client):
    client, _main, headers = make_client(user="fcastmv00000003")
    upload_csv(client, headers, single_series_csv(n=200))
    _train(client, headers, column="value", feature_columns=["sales"])
    # retraining without features clears the multivariate state
    r = _train(client, headers, column="value")
    assert r.json()["feature_columns"] == []
    hist = client.get("/data", headers=headers, params={"column": "value"}).json()["data"][-15:]
    p = client.post("/predict", headers=headers, json={"values": hist, "steps": 5})
    assert len(p.json()["predictions"]) == 5


def test_infer_frequency_handles_duplicate_dates(make_client):
    import pandas as pd
    _client, main, _headers = make_client()
    dup = pd.Series(pd.to_datetime(
        ["2021-01-01"] * 3 + ["2021-01-02"] * 3 + ["2021-01-03"] * 3
    ))
    assert main._infer_frequency(dup) == ("daily", 1.0)
    clean = pd.Series(pd.date_range("2021-01-01", periods=10, freq="D"))
    assert main._infer_frequency(clean) == ("daily", 1.0)
