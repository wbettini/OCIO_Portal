"""Shared service-layer helpers used across all domain services."""
from __future__ import annotations

import datetime as dt
import json
from typing import Any, TypeVar

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import AuditEvent
from app.schemas.common import Page

T = TypeVar("T")


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


def paginate(db: Session, stmt, page: int, page_size: int) -> tuple[list[Any], int]:
    """Executes `stmt` with limit/offset paging and returns (rows, total)."""
    page = max(page, 1)
    page_size = max(min(page_size, 200), 1)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.limit(page_size).offset((page - 1) * page_size)).all()
    return list(rows), total


def to_page(items: list[Any], total: int, page: int, page_size: int) -> Page:
    return Page(items=items, total=total, page=page, page_size=page_size)


def require_role(user: PersonaProfile, *allowed: str) -> None:
    if not set(user.roles).intersection(allowed):
        raise HTTPException(
            status_code=403,
            detail=f"Persona '{user.persona_key}' lacks required role(s): {', '.join(allowed)}",
        )


def bump_version(entity: Any, expected_version: int) -> None:
    if entity.version != expected_version:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Version conflict: expected {expected_version}, "
                f"but current version is {entity.version}. Reload and retry."
            ),
        )
    entity.version += 1


def record_audit(
    db: Session,
    *,
    entity_type: str,
    entity_id: int,
    action: str,
    actor_persona_key: str,
    summary: str,
) -> None:
    event = AuditEvent(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_persona_key=actor_persona_key,
        summary=summary,
        created_at=utcnow(),
    )
    db.add(event)


def json_dumps(value: Any) -> str:
    return json.dumps(value)


def json_loads_or_default(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default
