"""Shared FastAPI dependencies."""
from __future__ import annotations

from fastapi import Header

from app.core.auth import PersonaProfile, get_auth_adapter


def get_current_user(x_persona: str | None = Header(default=None)) -> PersonaProfile:
    adapter = get_auth_adapter()
    return adapter.resolve(x_persona)
