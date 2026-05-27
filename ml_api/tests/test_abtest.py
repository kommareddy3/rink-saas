"""A/B Test Analyzer (/abtest/continuous, /abtest/conversion)."""
from .helpers import ab_continuous_payload, ab_conversion_payload


# --- Continuous (Welch's t-test) -------------------------------------------

def test_continuous_significant(make_client):
    client, _main, headers = make_client(user="abuser0000000001")
    body = ab_continuous_payload(n=80, control_mean=10.0, variant_mean=12.0, sd=2.0)
    r = client.post("/abtest/continuous", headers=headers, json=body)
    assert r.status_code == 200
    d = r.json()
    assert d["test"] == "welch-t"
    assert d["control"]["n"] == 80 and d["variant"]["n"] == 80
    assert d["significant"] is True          # a 2-unit shift at sd 2, n 80 is clear
    assert 0.0 <= d["p_value"] <= 1.0
    assert d["df"] is not None


def test_continuous_no_difference_shape(make_client):
    client, _main, headers = make_client(user="abuser0000000002")
    body = ab_continuous_payload(n=100, control_mean=10.0, variant_mean=10.0, sd=2.0)
    r = client.post("/abtest/continuous", headers=headers, json=body)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d["significant"], bool)
    assert 0.0 <= d["p_value"] <= 1.0


def test_continuous_rejects_short_arm(make_client):
    client, _main, headers = make_client(user="abuser0000000003")
    body = {"control": {"name": "A", "values": [1.0]},
            "variant": {"name": "B", "values": [2.0, 3.0]}, "alpha": 0.05}
    r = client.post("/abtest/continuous", headers=headers, json=body)
    assert r.status_code == 422  # ContinuousArm.values min_length=2


def test_continuous_rejects_bad_alpha(make_client):
    client, _main, headers = make_client(user="abuser0000000004")
    for bad in (0, 0.5, 0.9):
        body = ab_continuous_payload(n=10)
        body["alpha"] = bad
        r = client.post("/abtest/continuous", headers=headers, json=body)
        assert r.status_code == 422, bad


# --- Conversion (two-proportion z-test) ------------------------------------

def test_conversion_significant(make_client):
    client, _main, headers = make_client(user="abuser0000000005")
    body = ab_conversion_payload(n1=2000, c1=200, n2=2000, c2=280)  # 10% vs 14%
    r = client.post("/abtest/conversion", headers=headers, json=body)
    assert r.status_code == 200
    d = r.json()
    assert d["test"] == "two-proportion-z"
    assert d["significant"] is True
    assert d["required_sample_size_per_arm"] is not None
    assert abs(d["control"]["metric"] - 0.10) < 1e-6


def test_conversion_conversions_exceed_visitors(make_client):
    client, _main, headers = make_client(user="abuser0000000006")
    body = ab_conversion_payload(n1=100, c1=150, n2=100, c2=10)
    r = client.post("/abtest/conversion", headers=headers, json=body)
    assert r.status_code == 400


def test_conversion_zero_conversions_both(make_client):
    client, _main, headers = make_client(user="abuser0000000007")
    body = ab_conversion_payload(n1=500, c1=0, n2=500, c2=0)
    r = client.post("/abtest/conversion", headers=headers, json=body)
    assert r.status_code == 400


def test_conversion_rejects_zero_visitors(make_client):
    client, _main, headers = make_client(user="abuser0000000008")
    body = {"control": {"name": "A", "visitors": 0, "conversions": 0},
            "variant": {"name": "B", "visitors": 100, "conversions": 10}, "alpha": 0.05}
    r = client.post("/abtest/conversion", headers=headers, json=body)
    assert r.status_code == 422  # ConversionArm.visitors gt=0
