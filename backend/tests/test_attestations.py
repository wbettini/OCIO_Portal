from __future__ import annotations

from fastapi.testclient import TestClient


def test_seeded_campaigns_include_both_names(client: TestClient) -> None:
    response = client.get("/api/v1/attestations/campaigns", headers={"X-Persona": "admin"})
    assert response.status_code == 200
    names = {c["name"] for c in response.json()}
    assert any("Application Ownership Certification" in n for n in names)
    assert any("Workforce Capability Validation" in n for n in names)


def _find_draft_assignment(client: TestClient, persona: str) -> dict:
    response = client.get(
        "/api/v1/attestations/assignments",
        params={"assignee_persona_key": persona, "status": "Draft"},
        headers={"X-Persona": persona},
    )
    assert response.status_code == 200
    items = response.json()["items"]
    assert items
    return items[0]


def test_save_draft_then_submit_round_trip(client: TestClient) -> None:
    assignment = _find_draft_assignment(client, "steward")
    assignment_id = assignment["id"]

    detail = client.get(
        f"/api/v1/attestations/assignments/{assignment_id}", headers={"X-Persona": "steward"}
    ).json()
    questions = detail["definition"]["questions"]

    def _answer_for(question: dict) -> dict:
        base = {"question_id": question["id"]}
        qtype = question["question_type"]
        if qtype == "boolean":
            base["answer_boolean"] = True
        elif qtype == "choice":
            base["answer_choice"] = "Active"
        elif qtype == "numeric":
            base["answer_numeric"] = 8
        elif qtype == "date":
            base["answer_date"] = "2026-01-01"
        else:
            base["answer_text"] = "Looks accurate."
        return base

    answers = [_answer_for(q) for q in questions]

    draft_response = client.post(
        f"/api/v1/attestations/assignments/{assignment_id}/draft",
        json={"version": assignment["version"], "answers": answers},
        headers={"X-Persona": "steward"},
    )
    assert draft_response.status_code == 200
    draft_body = draft_response.json()
    assert draft_body["assignment"]["status"] == "Draft"

    submit_response = client.post(
        f"/api/v1/attestations/assignments/{assignment_id}/submit",
        json={
            "version": draft_body["assignment"]["version"],
            "answers": answers,
            "acknowledgement": True,
        },
        headers={"X-Persona": "steward"},
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["assignment"]["status"] == "Submitted"


def test_submit_without_acknowledgement_returns_422(client: TestClient) -> None:
    assignment = _find_draft_assignment(client, "publisher")
    response = client.post(
        f"/api/v1/attestations/assignments/{assignment['id']}/submit",
        json={"version": assignment["version"], "answers": [], "acknowledgement": False},
        headers={"X-Persona": "publisher"},
    )
    assert response.status_code == 422


def test_campaign_crud_round_trip(client: TestClient) -> None:
    definitions = client.get(
        "/api/v1/attestations/definitions", headers={"X-Persona": "admin"}
    ).json()
    definition_id = definitions[0]["id"]

    create_response = client.post(
        "/api/v1/attestations/campaigns",
        json={
            "definition_id": definition_id,
            "name": "Q1 Spot Check Campaign",
            "description": "Ad-hoc spot check",
            "opens_at": None,
            "closes_at": None,
        },
        headers={"X-Persona": "manager"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "Q1 Spot Check Campaign"

    update_response = client.put(
        f"/api/v1/attestations/campaigns/{created['id']}",
        json={
            "definition_id": definition_id,
            "name": "Q1 Spot Check Campaign (Revised)",
            "description": "Ad-hoc spot check, revised",
            "opens_at": None,
            "closes_at": None,
            "version": created["version"],
        },
        headers={"X-Persona": "manager"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["name"] == "Q1 Spot Check Campaign (Revised)"

    delete_response = client.delete(
        f"/api/v1/attestations/campaigns/{created['id']}",
        headers={"X-Persona": "manager"},
    )
    assert delete_response.status_code == 200

    get_after_delete = client.get(
        f"/api/v1/attestations/campaigns/{created['id']}", headers={"X-Persona": "manager"}
    )
    assert get_after_delete.status_code == 404


def test_campaign_create_forbidden_for_viewer_only_persona(client: TestClient) -> None:
    definitions = client.get(
        "/api/v1/attestations/definitions", headers={"X-Persona": "admin"}
    ).json()
    definition_id = definitions[0]["id"]

    response = client.post(
        "/api/v1/attestations/campaigns",
        json={
            "definition_id": definition_id,
            "name": "Unauthorized Campaign",
        },
        headers={"X-Persona": "executive"},
    )
    assert response.status_code == 403


def test_delete_campaign_with_assignments_conflicts(client: TestClient) -> None:
    campaigns = client.get(
        "/api/v1/attestations/campaigns", headers={"X-Persona": "admin"}
    ).json()
    seeded_campaign_id = campaigns[0]["id"]

    response = client.delete(
        f"/api/v1/attestations/campaigns/{seeded_campaign_id}", headers={"X-Persona": "manager"}
    )
    assert response.status_code == 409
