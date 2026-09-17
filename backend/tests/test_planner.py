from __future__ import annotations

from fastapi.testclient import TestClient


def test_coverage_view_returns_alerts(client: TestClient) -> None:
    response = client.get("/api/v1/planner/coverage", headers={"X-Persona": "manager"})
    assert response.status_code == 200
    body = response.json()
    assert "alerts" in body
    assert isinstance(body["alerts"], list)


def test_workforce_view_returns_person_assignments(client: TestClient) -> None:
    people = client.get("/api/v1/workforce", headers={"X-Persona": "manager"}).json()
    person_id = people["items"][0]["id"]

    response = client.get(f"/api/v1/planner/workforce/{person_id}", headers={"X-Persona": "manager"})
    assert response.status_code == 200
    body = response.json()
    assert body["person"]["id"] == person_id
    assert "applications" in body
    assert "platforms" in body
    assert "capabilities" in body


def test_application_view_returns_alerts(client: TestClient) -> None:
    apps = client.get("/api/v1/applications", headers={"X-Persona": "manager"}).json()
    application_id = apps["items"][0]["id"]

    response = client.get(
        f"/api/v1/planner/applications/{application_id}", headers={"X-Persona": "manager"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["application"]["id"] == application_id
    assert "alerts" in body
