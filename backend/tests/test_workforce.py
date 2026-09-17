from __future__ import annotations

from fastapi.testclient import TestClient


def test_workforce_list_returns_seeded_rows(client: TestClient) -> None:
    response = client.get("/api/v1/workforce", headers={"X-Persona": "manager"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 15


def test_workforce_search_filter(client: TestClient) -> None:
    response = client.get(
        "/api/v1/workforce", params={"search": "Rivera"}, headers={"X-Persona": "manager"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert all("rivera" in item["full_name"].lower() for item in body["items"])


def test_create_person_requires_role(client: TestClient) -> None:
    payload = {
        "full_name": "No Role Tester",
        "email": "no.role.tester@demo.ocio.local",
        "title": "Tester",
        "status": "Active",
        "role_family": "Engineer",
    }
    response = client.post("/api/v1/workforce", json=payload, headers={"X-Persona": "viewer"})
    assert response.status_code == 403


def test_admin_can_create_person(client: TestClient) -> None:
    payload = {
        "full_name": "New Hire Demo",
        "email": "new.hire.demo@demo.ocio.local",
        "title": "Associate Engineer",
        "status": "Active",
        "role_family": "Engineer",
    }
    response = client.post("/api/v1/workforce", json=payload, headers={"X-Persona": "admin"})
    assert response.status_code == 201
    assert response.json()["full_name"] == "New Hire Demo"


def test_optimistic_concurrency_conflict_returns_409(client: TestClient) -> None:
    create_payload = {
        "full_name": "Concurrency Tester",
        "email": "concurrency.tester@demo.ocio.local",
        "title": "Engineer",
        "status": "Active",
        "role_family": "Engineer",
    }
    created = client.post(
        "/api/v1/workforce", json=create_payload, headers={"X-Persona": "admin"}
    ).json()

    stale_update = {**create_payload, "title": "Senior Engineer", "version": 999}
    response = client.put(
        f"/api/v1/workforce/{created['id']}",
        json=stale_update,
        headers={"X-Persona": "admin"},
    )
    assert response.status_code == 409


def test_admin_can_delete_person(client: TestClient) -> None:
    payload = {
        "full_name": "Delete Person Demo",
        "email": "delete.person.demo@demo.ocio.local",
        "title": "Engineer",
        "status": "Active",
        "role_family": "Engineer",
    }
    created = client.post("/api/v1/workforce", json=payload, headers={"X-Persona": "admin"}).json()

    response = client.delete(
        f"/api/v1/workforce/{created['id']}", headers={"X-Persona": "admin"}
    )
    assert response.status_code == 200
    assert client.get(f"/api/v1/workforce/{created['id']}", headers={"X-Persona": "admin"}).status_code == 404


def test_admin_can_delete_application(client: TestClient) -> None:
    payload = {
        "name": "Delete App Demo",
        "description": "Created for delete verification",
        "criticality": "Medium",
        "lifecycle_state": "Active",
        "owner_person_id": None,
    }
    created = client.post(
        "/api/v1/applications", json=payload, headers={"X-Persona": "admin"}
    ).json()

    response = client.delete(
        f"/api/v1/applications/{created['id']}", headers={"X-Persona": "admin"}
    )
    assert response.status_code == 200
    assert client.get(f"/api/v1/applications/{created['id']}", headers={"X-Persona": "admin"}).status_code == 404


def test_admin_can_delete_platform(client: TestClient) -> None:
    payload = {
        "name": "Delete Platform Demo",
        "platform_type": "Analytics",
        "lifecycle_state": "Active",
        "support_status": "Supported",
        "strategic_classification": "Strategic",
        "owner_person_id": None,
    }
    created = client.post(
        "/api/v1/platforms", json=payload, headers={"X-Persona": "admin"}
    ).json()

    response = client.delete(
        f"/api/v1/platforms/{created['id']}", headers={"X-Persona": "admin"}
    )
    assert response.status_code == 200
    assert client.get(f"/api/v1/platforms/{created['id']}", headers={"X-Persona": "admin"}).status_code == 404
