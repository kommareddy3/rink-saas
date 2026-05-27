"""Customer Segmentation (/segmentation/run): happy path, negative, edge cases."""
from .conftest import post_csv
from .helpers import segmentation_csv, single_series_csv


def test_segmentation_auto_k(make_client):
    client, _main, headers = make_client(user="seguser000000001")
    r = post_csv(client, "/segmentation/run", headers, segmentation_csv(n_per=60))
    assert r.status_code == 200
    d = r.json()
    assert d["auto_k"] is True
    assert 2 <= d["n_clusters"] <= 8
    assert d["rows"] == 180
    assert set(["annual_spend", "visits", "recency_days"]).issubset(d["features_used"])
    assert "customer_id" not in d["features_used"]   # *_id dropped
    assert len(d["clusters"]) == d["n_clusters"]
    assert len(d["points"]) == d["rows"]
    assert sum(c["size"] for c in d["clusters"]) == d["rows"]


def test_segmentation_explicit_k(make_client):
    client, _main, headers = make_client(user="seguser000000002")
    r = post_csv(client, "/segmentation/run", headers, segmentation_csv(n_per=60),
                 data={"k": "3"})
    assert r.status_code == 200
    d = r.json()
    assert d["auto_k"] is False
    assert d["n_clusters"] == 3


def test_segmentation_features_param(make_client):
    client, _main, headers = make_client(user="seguser000000003")
    r = post_csv(client, "/segmentation/run", headers, segmentation_csv(n_per=60),
                 data={"features": "annual_spend,visits"})
    assert r.status_code == 200
    assert r.json()["features_used"] == ["annual_spend", "visits"]


def test_segmentation_unknown_column(make_client):
    client, _main, headers = make_client(user="seguser000000004")
    r = post_csv(client, "/segmentation/run", headers, segmentation_csv(n_per=60),
                 data={"features": "nope,annual_spend"})
    assert r.status_code == 400


def test_segmentation_k_out_of_range(make_client):
    client, _main, headers = make_client(user="seguser000000005")
    for bad in ("1", "13"):
        r = post_csv(client, "/segmentation/run", headers, segmentation_csv(n_per=60),
                     data={"k": bad})
        assert r.status_code == 400, bad


def test_segmentation_too_few_rows(make_client):
    client, _main, headers = make_client(user="seguser000000006")
    r = post_csv(client, "/segmentation/run", headers, segmentation_csv(n_per=5))  # 15 rows
    assert r.status_code == 400


def test_segmentation_too_few_numeric_features(make_client):
    client, _main, headers = make_client(user="seguser000000007")
    # single_series has only 'value'/'sales' numeric but also 'date'/'region';
    # restrict to one numeric column -> not enough for auto clustering.
    r = post_csv(client, "/segmentation/run", headers, single_series_csv(n=60),
                 data={"features": "region"})
    assert r.status_code == 400  # 'region' is non-numeric -> none numeric
