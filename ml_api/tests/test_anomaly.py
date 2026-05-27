"""Anomaly Detection (/anomaly/detect): happy path, negative, edge cases."""
import pytest

from .conftest import post_csv
from .helpers import anomaly_csv, single_series_csv


def test_anomaly_happy_path(make_client):
    client, _main, headers = make_client(user="anomuser00000001")
    r = post_csv(client, "/anomaly/detect", headers, anomaly_csv(n=150, n_anomalies=6),
                 data={"contamination": "0.05"})
    assert r.status_code == 200
    d = r.json()
    assert d["column"] == "value"
    assert d["rows"] == 150
    assert d["anomalies"] >= 1
    assert 0.0 <= d["anomaly_rate"] <= 0.2
    assert len(d["points"]) == d["rows"]
    assert d["date_column"] == "date"
    # roughly tracks the requested contamination
    assert abs(d["anomalies"] - 0.05 * d["rows"]) <= 0.05 * d["rows"] + 3


def test_anomaly_column_override(make_client):
    client, _main, headers = make_client(user="anomuser00000002")
    r = post_csv(client, "/anomaly/detect", headers, single_series_csv(n=120),
                 data={"column": "sales", "contamination": "0.1"})
    assert r.status_code == 200
    assert r.json()["column"] == "sales"


def test_anomaly_rejects_too_few_rows(make_client):
    client, _main, headers = make_client(user="anomuser00000003")
    r = post_csv(client, "/anomaly/detect", headers, anomaly_csv(n=15))
    assert r.status_code == 400


@pytest.mark.parametrize("bad", ["0", "0.0005", "0.6", "1"])
def test_anomaly_rejects_bad_contamination(make_client, bad):
    client, _main, headers = make_client(user="anomuser00000004")
    r = post_csv(client, "/anomaly/detect", headers, anomaly_csv(n=120),
                 data={"contamination": bad})
    assert r.status_code == 400


def test_anomaly_rejects_non_csv(make_client):
    client, _main, headers = make_client(user="anomuser00000005")
    r = post_csv(client, "/anomaly/detect", headers, b"\x89PNG\r\n\x1a\n" + b"x" * 40,
                 filename="img.png")
    assert r.status_code == 400


def test_anomaly_edge_contamination_bounds(make_client):
    client, _main, headers = make_client(user="anomuser00000006")
    for c in ("0.001", "0.5"):
        r = post_csv(client, "/anomaly/detect", headers, anomaly_csv(n=120),
                     data={"contamination": c})
        assert r.status_code == 200, c
