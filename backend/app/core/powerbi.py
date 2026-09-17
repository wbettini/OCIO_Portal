"""Power BI embedding adapter boundary.

`PowerBIEmbedAdapter` is the protocol a real Power BI embedding integration
would implement (fetching embed tokens/URLs via the Power BI REST API).
`PlaceholderPowerBIAdapter` never calls out to Azure; it returns a
placeholder `EmbedInfo` so the UI can render a consistent "not connected"
state in this credential-free prototype.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class EmbedInfo:
    provider: str
    embed_mode: str
    embed_url: str | None
    token: str | None
    expires_in_seconds: int | None
    access_state: str
    message: str


class PowerBIEmbedAdapter(Protocol):
    def get_embed_info(self, report_key: str) -> EmbedInfo: ...


class PlaceholderPowerBIAdapter:
    """Prototype implementation returning a placeholder embed payload."""

    def get_embed_info(self, report_key: str) -> EmbedInfo:
        return EmbedInfo(
            provider="power-bi",
            embed_mode="placeholder",
            embed_url=None,
            token=None,
            expires_in_seconds=None,
            access_state="placeholder",
            message=(
                f"Report '{report_key}' is not connected to Power BI in this local "
                "prototype. Configure OCIO_POWERBI_* settings and implement a real "
                "PowerBIEmbedAdapter to enable live embedding."
            ),
        )


def get_powerbi_adapter() -> PowerBIEmbedAdapter:
    return PlaceholderPowerBIAdapter()
