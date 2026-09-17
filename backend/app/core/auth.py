"""Identity adapter boundary.

`AuthAdapter` is the protocol every identity provider integration must
satisfy. `LocalDevAuthAdapter` is the prototype implementation: it trusts
an `X-Persona` header instead of performing real authentication. Swapping
in Entra ID / MSAL later means implementing this protocol without touching
route or service code.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class PersonaProfile:
    """A resolved identity for the current request."""

    persona_key: str
    display_name: str
    title: str
    roles: tuple[str, ...]
    email: str


# Five fixed demo personas. Keys match seeded UserProfile rows.
_PERSONAS: dict[str, PersonaProfile] = {
    "executive": PersonaProfile(
        persona_key="executive",
        display_name="Alex Rivera",
        title="CIO",
        roles=("executive", "viewer"),
        email="alex.rivera@demo.ocio.local",
    ),
    "manager": PersonaProfile(
        persona_key="manager",
        display_name="Priya Shah",
        title="Technology Manager ",
        roles=("manager", "viewer"),
        email="priya.shah@demo.ocio.local",
    ),
    "steward": PersonaProfile(
        persona_key="steward",
        display_name="Jordan Chen",
        title="Data Steward",
        roles=("steward", "viewer"),
        email="jordan.chen@demo.ocio.local",
    ),
    "publisher": PersonaProfile(
        persona_key="publisher",
        display_name="Sam Patel",
        title="Content Publisher",
        roles=("publisher", "viewer"),
        email="sam.patel@demo.ocio.local",
    ),
    "admin": PersonaProfile(
        persona_key="admin",
        display_name="Morgan Lee",
        title="Portal Administrator",
        roles=("admin", "manager", "steward", "publisher", "viewer"),
        email="morgan.lee@demo.ocio.local",
    ),
}

DEFAULT_PERSONA_KEY = "executive"


class AuthAdapter(Protocol):
    """Contract for resolving the current caller's identity."""

    def resolve(self, persona_header: str | None) -> PersonaProfile: ...

    def list_personas(self) -> list[PersonaProfile]: ...


class LocalDevAuthAdapter:
    """Resolves identity from an `X-Persona` header for local development."""

    def resolve(self, persona_header: str | None) -> PersonaProfile:
        key = (persona_header or DEFAULT_PERSONA_KEY).strip().lower()
        return _PERSONAS.get(key, _PERSONAS[DEFAULT_PERSONA_KEY])

    def list_personas(self) -> list[PersonaProfile]:
        return list(_PERSONAS.values())


def get_auth_adapter() -> AuthAdapter:
    return LocalDevAuthAdapter()
