"""Upload content scanning: reject binaries / archives / corrupt text."""
import pytest

from .conftest import upload_csv
from .helpers import single_series_csv

BAD_PAYLOADS = {
    "png": b"\x89PNG\r\n\x1a\n" + b"\x00" * 50,
    "exe_mz": b"MZ\x90\x00" + b"\x00" * 50,
    "zip_xlsx": b"PK\x03\x04" + b"\x00" * 50,
    "pdf": b"%PDF-1.7\njunk",
    "gzip": b"\x1f\x8b\x08\x00" + b"\x00" * 20,
    "elf": b"\x7fELF" + b"\x00" * 50,
    "null_bytes": b"date,value\n2020-01-01,1\x00\n2020-01-02,2\n",
}


@pytest.mark.parametrize("name", list(BAD_PAYLOADS))
def test_rejects_bad_payloads(make_client, name):
    client, _main, headers = make_client(user="scanuser00000001")
    res = upload_csv(client, headers, BAD_PAYLOADS[name])
    assert res.status_code == 400, f"{name} should be rejected"


def test_accepts_valid_csv(make_client):
    client, _main, headers = make_client(user="scanuser00000002")
    res = upload_csv(client, headers, single_series_csv(n=60))
    assert res.status_code == 200


def test_rejects_non_csv_extension(make_client):
    client, _main, headers = make_client(user="scanuser00000003")
    res = upload_csv(client, headers, single_series_csv(n=60), filename="data.txt")
    assert res.status_code == 400


def test_rejects_empty_upload(make_client):
    client, _main, headers = make_client(user="scanuser00000004")
    res = upload_csv(client, headers, b"")
    assert res.status_code == 400


def test_requires_user_id_header(make_client):
    client, _main, _headers = make_client()
    res = client.post("/analyze")  # no X-User-ID
    assert res.status_code == 400
