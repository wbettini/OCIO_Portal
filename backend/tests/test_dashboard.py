from __future__ import annotations

from fastapi.testclient import TestClient


def test_dashboard_summary_has_all_kpis(client: TestClient) -> None:
    response = client.get("/api/v1/dashboard/summary", headers={"X-Persona": "executive"})
    assert response.status_code == 200
    body = response.json()
    expected_keys = {
        "total_workforce",
        "applications_supported",
        "platforms_managed",
        "assets_approaching_eol_180d",
        "open_attestations",
        "capability_coverage_percent",
    }
    assert expected_keys.issubset(body.keys())
