from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile, get_auth_adapter
from app.schemas.domain import PersonaRead

router = APIRouter(prefix="/me", tags=["identity"])


@router.get("", response_model=PersonaRead)
def read_current_user(user: PersonaProfile = Depends(get_current_user)) -> PersonaRead:
    return PersonaRead(
        persona_key=user.persona_key,
        display_name=user.display_name,
        title=user.title,
        roles=list(user.roles),
        email=user.email,
    )


@router.get("/personas", response_model=list[PersonaRead])
def list_personas() -> list[PersonaRead]:
    adapter = get_auth_adapter()
    return [
        PersonaRead(
            persona_key=p.persona_key,
            display_name=p.display_name,
            title=p.title,
            roles=list(p.roles),
            email=p.email,
        )
        for p in adapter.list_personas()
    ]
