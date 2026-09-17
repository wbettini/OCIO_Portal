from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_ok(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_default_persona_is_executive(client: TestClient) -> None:
    response = client.get("/api/v1/me")
    assert response.status_code == 200
    assert response.json()["persona_key"] == "executive"


def test_persona_header_switches_user(client: TestClient) -> None:
    response = client.get("/api/v1/me", headers={"X-Persona": "admin"})
    assert response.status_code == 200
    assert response.json()["persona_key"] == "admin"


def test_personas_catalog_has_all_five(client: TestClient) -> None:
    response = client.get("/api/v1/me/personas")
    assert response.status_code == 200
    keys = {p["persona_key"] for p in response.json()}
    assert keys == {"executive", "manager", "steward", "publisher", "admin"}
