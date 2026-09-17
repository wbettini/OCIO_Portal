from __future__ import annotations

from fastapi.testclient import TestClient


def test_capabilities_list_returns_computed_coverage(client: TestClient) -> None:
    response = client.get("/api/v1/capabilities", headers={"X-Persona": "steward"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 10
    for item in body["items"]:
        assert "current_coverage" in item
        assert isinstance(item["current_coverage"], int | float)


def test_get_single_capability_returns_computed_coverage(client: TestClient) -> None:
    list_response = client.get("/api/v1/capabilities", headers={"X-Persona": "steward"})
    capability_id = list_response.json()["items"][0]["id"]

    response = client.get(f"/api/v1/capabilities/{capability_id}", headers={"X-Persona": "steward"})
    assert response.status_code == 200
    assert "current_coverage" in response.json()
