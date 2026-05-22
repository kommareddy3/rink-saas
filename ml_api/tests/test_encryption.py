"""Encryption-at-rest: ciphertext on disk, transparent decryption, fallback."""
import io

import pandas as pd

from .conftest import upload_csv
from .helpers import single_series_csv


def test_upload_writes_ciphertext(make_client):
    client, main, headers = make_client(encryption=True, user="encuser000000001")
    csv = single_series_csv()
    res = upload_csv(client, headers, csv)
    assert res.status_code == 200
    assert res.json()["encrypted"] is True

    on_disk = (main.USERS_DIR / "encuser000000001" / "uploaded.csv").read_bytes()
    assert on_disk.startswith(b"gAAAAA")        # Fernet token
    assert on_disk != csv
    assert b"date,value" not in on_disk          # no plaintext header leaked


def test_round_trip_decrypts_identically(make_client):
    client, main, headers = make_client(encryption=True, user="encuser000000002")
    csv = single_series_csv()
    upload_csv(client, headers, csv)

    res = client.get("/data", headers=headers, params={"limit": 20000, "column": "value"})
    assert res.status_code == 200
    got = res.json()["data"]
    expected = pd.read_csv(io.BytesIO(csv))["value"].tolist()
    assert len(got) == len(expected)
    assert all(abs(a - b) < 1e-6 for a, b in zip(got, expected))


def test_plaintext_mode_stores_plaintext(make_client):
    client, main, headers = make_client(encryption=False, user="plainuser0000001")
    csv = single_series_csv()
    res = upload_csv(client, headers, csv)
    assert res.json()["encrypted"] is False
    on_disk = (main.USERS_DIR / "plainuser0000001" / "uploaded.csv").read_bytes()
    assert on_disk == csv


def test_legacy_plaintext_readable_with_key_on(make_client):
    """A file written before encryption was enabled must still be readable."""
    client, main, headers = make_client(encryption=True, user="encuser000000003")
    csv = single_series_csv()
    legacy_dir = main.USERS_DIR / "legacyuser000001"
    legacy_dir.mkdir(parents=True, exist_ok=True)
    (legacy_dir / "uploaded.csv").write_bytes(csv)  # plaintext, not encrypted

    res = client.get("/data", headers={"X-User-ID": "legacyuser000001"},
                     params={"column": "value"})
    assert res.status_code == 200
    assert len(res.json()["data"]) > 0


def test_invalid_key_disables_encryption_gracefully(make_client, monkeypatch, tmp_path):
    import importlib
    import sys
    monkeypatch.setenv("RINK_DATA_DIR", str(tmp_path / "badkey"))
    monkeypatch.setenv("RINK_ENCRYPTION_KEY", "not-a-valid-fernet-key")
    main = importlib.reload(sys.modules["main"]) if "main" in sys.modules else __import__("main")
    assert main.ENCRYPTION_ENABLED is False
    assert main.health()["encryption_at_rest"] is False


def test_health_reports_encryption_flag(make_client):
    client, main, headers = make_client(encryption=True)
    assert client.get("/health").json()["encryption_at_rest"] is True
