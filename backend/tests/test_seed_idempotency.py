from __future__ import annotations

from app.db.seed import run_seed
from app.db.session import SessionLocal
from app.models.entities import Person
from sqlalchemy import func, select


def test_seed_is_idempotent() -> None:
    db = SessionLocal()
    try:
        before = db.scalar(select(func.count()).select_from(Person)) or 0
    finally:
        db.close()

    run_seed()

    db = SessionLocal()
    try:
        after = db.scalar(select(func.count()).select_from(Person)) or 0
    finally:
        db.close()

    assert before == after
