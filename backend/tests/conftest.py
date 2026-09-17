"""Shared pytest fixtures: isolated temp SQLite DB, seeded once per test
session, and a shared TestClient."""
from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator

import pytest

_tmp_dir = tempfile.mkdtemp(prefix="ocio_portal_test_")
_tmp_db_path = os.path.join(_tmp_dir, "test.db")
os.environ["OCIO_DATABASE_URL"] = f"sqlite:///{_tmp_db_path}"
os.environ["OCIO_SEED_ON_STARTUP"] = "false"

from app.db.base import Base  # noqa: E402
from app.db.engine import engine  # noqa: E402
from app.db.seed import run_seed  # noqa: E402
from app.main import app  # noqa: E402
from app.models import entities  # noqa: E402,F401
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _prepare_database() -> Iterator[None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    run_seed()
    yield


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client
