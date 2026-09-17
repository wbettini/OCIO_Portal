"""Shared Pydantic schemas: generic paging envelope and error shapes."""
from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class ErrorEnvelope(BaseModel):
    error: str
    detail: str | list | dict
    code: int
