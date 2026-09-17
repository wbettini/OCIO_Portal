"""Application configuration for OCIO Portal backend.

Loaded once via `get_settings()` (lru_cache) from environment variables /
.env file. No secrets are hard-coded; production deployments must supply
their own environment configuration.
"""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="OCIO_", env_file=".env", extra="ignore")

    env: str = "local"
    database_url: str = "sqlite:///./ocio_portal.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    seed_on_startup: bool = True
    log_level: str = "INFO"

    entra_tenant_id: str = "00000000-0000-0000-0000-000000000000"
    entra_client_id: str = "00000000-0000-0000-0000-000000000000"
    entra_client_secret: str = "changeme-placeholder"

    powerbi_workspace_id: str = "00000000-0000-0000-0000-000000000000"
    powerbi_tenant_id: str = "00000000-0000-0000-0000-000000000000"
    powerbi_client_id: str = "00000000-0000-0000-0000-000000000000"
    powerbi_client_secret: str = "changeme-placeholder"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
