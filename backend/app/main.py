"""FastAPI application factory for OCIO Portal.

The lifespan handler creates all tables (via SQLAlchemy metadata) and,
when `OCIO_SEED_ON_STARTUP` is true, runs the idempotent seed routine.
Alembic is scaffolded for future incremental migrations but is not required
for this prototype's create-all-on-boot flow.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.db.base import Base
from app.db.engine import engine
from app.models import entities  # noqa: F401  (registers ORM models on Base.metadata)


def _stringify_ctx(errors: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pydantic v2 puts a raw exception object under `ctx` for some errors
    (e.g. ValueError from validators), which is not JSON-serializable.
    """
    safe_errors = []
    for error in errors:
        safe_error = dict(error)
        ctx = safe_error.get("ctx")
        if isinstance(ctx, dict):
            safe_error["ctx"] = {k: str(v) for k, v in ctx.items()}
        safe_errors.append(safe_error)
    return safe_errors


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    settings = get_settings()
    if settings.seed_on_startup:
        from app.db.seed import run_seed

        run_seed()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="OCIO Portal API",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": "http_error", "detail": exc.detail, "code": exc.status_code},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "error": "validation_error",
                "detail": _stringify_ctx(exc.errors()),
                "code": 422,
            },
        )

    app.include_router(api_router)

    return app


app = create_app()
