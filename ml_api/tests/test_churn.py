"""Churn Prediction (/churn/predict): happy path, negative, edge cases."""
from .conftest import post_csv
from .helpers import churn_csv, churn_csv_no_features, single_series_csv


def test_churn_happy_path(make_client):
    client, _main, headers = make_client(user="churnuser0000001")
    r = post_csv(client, "/churn/predict", headers, churn_csv(n=240))
    assert r.status_code == 200
    d = r.json()
    assert d["label_column"] == "churn"
    assert d["rows"] == 240
    assert len(d["feature_columns"]) >= 3          # numeric + one-hot 'plan'
    assert 0.0 <= d["accuracy"] <= 1.0
    assert d["auc"] is None or 0.0 <= d["auc"] <= 1.0
    # confusion matrix sums to the held-out test size
    cm = d["confusion"]
    assert cm["tn"] + cm["fp"] + cm["fn"] + cm["tp"] == d["test_size"]
    # risk buckets cover every row
    rd = d["risk_distribution"]
    assert rd["high"] + rd["medium"] + rd["low"] == d["rows"]
    assert "customer_id" not in d["feature_columns"]  # high-cardinality id skipped


def test_churn_label_override(make_client):
    client, _main, headers = make_client(user="churnuser0000002")
    r = post_csv(client, "/churn/predict", headers, churn_csv(n=200),
                 data={"label": "churn"})
    assert r.status_code == 200
    assert r.json()["label_column"] == "churn"


def test_churn_no_label_column(make_client):
    client, _main, headers = make_client(user="churnuser0000003")
    # single_series_csv has no 0/1 label column
    r = post_csv(client, "/churn/predict", headers, single_series_csv(n=120))
    assert r.status_code == 400


def test_churn_no_usable_features(make_client):
    client, _main, headers = make_client(user="churnuser0000004")
    r = post_csv(client, "/churn/predict", headers, churn_csv_no_features(n=60))
    assert r.status_code == 400


def test_churn_too_few_rows(make_client):
    client, _main, headers = make_client(user="churnuser0000005")
    # 12 rows: fails the >=30 row / >=5-per-class guard
    r = post_csv(client, "/churn/predict", headers, churn_csv(n=12))
    assert r.status_code == 400


def test_churn_rejects_non_csv(make_client):
    client, _main, headers = make_client(user="churnuser0000006")
    r = post_csv(client, "/churn/predict", headers, b"%PDF-1.7 not a csv", filename="x.pdf")
    assert r.status_code == 400
