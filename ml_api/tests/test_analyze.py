"""Schema profiling: date/value detection, ID candidates, panel detection."""
from .conftest import upload_csv
from .helpers import panel_csv, single_series_csv


def test_analyze_single_series(make_client):
    client, _main, headers = make_client(user="analyzesingle001")
    upload_csv(client, headers, single_series_csv(n=300))
    a = client.post("/analyze", headers=headers).json()

    assert a["rows"] == 300
    assert a["suggested_date_column"] == "date"
    assert a["suggested_value_column"] == "value"
    assert a["is_panel_data"] is False
    assert a["date_min"] == "2020-01-01"
    assert a["date_max"] is not None

    region = next(c for c in a["columns"] if c["name"] == "region")
    assert region["dtype"] == "categorical"
    assert region["is_id_candidate"] is True

    value = next(c for c in a["columns"] if c["name"] == "value")
    assert value["is_numeric"] is True


def test_analyze_panel_detects_group(make_client):
    client, _main, headers = make_client(user="analyzepanel0001")
    upload_csv(client, headers, panel_csv(per_city=200))
    a = client.post("/analyze", headers=headers).json()

    assert a["rows"] == 600
    assert a["is_panel_data"] is True
    assert a["suggested_group_column"] == "city"
    assert set(a["group_values"]) == {"Detroit", "Austin", "Seattle"}
    assert a["suggested_date_column"] == "day"
    assert a["suggested_value_column"] == "temp"
    assert any("panel" in w.lower() for w in a["warnings"])


def test_analyze_reports_encryption_flag(make_client):
    client, _main, headers = make_client(encryption=True, user="analyzeenc000001")
    upload_csv(client, headers, single_series_csv(n=60))
    a = client.post("/analyze", headers=headers).json()
    assert a["encryption_at_rest"] is True
