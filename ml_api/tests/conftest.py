"""Pytest fixtures for the RINK ML service.

Encryption state is decided at *import* time (the Fernet key is read from the
environment when ``main`` is first loaded). To exercise both the encrypted and
plaintext code paths we set the environment and then reload ``main`` inside a
factory fixture, pointing ``RINK_DATA_DIR`` at a per-test temp directory so each
test is fully isolated.

Requires the dev dependencies (``pytest`` + ``httpx``); see requirements-dev.txt.
Run from the ml_api/ directory:  ``pytest``
"""
from __future__ import annotations

import importlib
import os
import sys

import pytest

# Make ``import main`` resolve to ml_api/main.py regardless of CWD.
ML_API_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ML_API_DIR not in sys.path:
    sys.path.insert(0, ML_API_DIR)


def _load_main(data_dir: str, encryption: bool):
    os.environ["RINK_DATA_DIR"] = data_dir
    os.environ.pop("GATEWAY_SECRET", None)  # no shared-secret in tests
    if encryption:
        from cryptography.fernet import Fernet
        os.environ["RINK_ENCRYPTION_KEY"] = Fernet.generate_key().decode()
    else:
        os.environ.pop("RINK_ENCRYPTION_KEY", None)

    if "main" in sys.modules:
        main = importlib.reload(sys.modules["main"])
    else:
        import main  # type: ignore
    return main


@pytest.fixture
def make_client(tmp_path):
    """Returns a factory: make_client(encryption=True, user="...") ->
    (TestClient, main_module, headers)."""
    from fastapi.testclient import TestClient

    def _factory(encryption: bool = True, user: str = "testuser12345678"):
        sub = tmp_path / ("enc" if encryption else "plain")
        main = _load_main(str(sub), encryption)
        client = TestClient(main.app)
        headers = {"X-User-ID": user}
        return client, main, headers

    return _factory


def upload_csv(client, headers, csv_bytes, filename="data.csv"):
    """Helper: POST a CSV to /upload and return the response."""
    return client.post(
        "/upload",
        headers=headers,
        files={"file": (filename, csv_bytes, "text/csv")},
    )
