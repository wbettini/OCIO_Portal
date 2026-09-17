# Enterprise Integration Guide

This prototype deliberately isolates three integration points behind small
adapter interfaces. Swapping any of them for a production implementation should
require **no changes** to route handlers, service logic, or the frontend API
contract — only a new adapter implementation and a factory function change.

## 1. Database: SQLite → SQL Server / Azure SQL

**Today**: `OCIO_DATABASE_URL=sqlite:///./ocio_portal.db`, schema created with
`Base.metadata.create_all()` at startup (`db/seed.py`), no migrations applied.

**To swap in SQL Server**:
1. All ORM models already use portable types (integer surrogate PKs,
   `Numeric(precision, scale)` instead of `Float`, timezone-aware `DateTime`), so
   no model changes should be required for standard SQL Server compatibility.
2. Change `OCIO_DATABASE_URL` to a SQL Server DSN, e.g.
   `mssql+pyodbc://user:pass@host/db?driver=ODBC+Driver+18+for+SQL+Server`, and add
   `pyodbc` (or `pymssql`) to `backend/pyproject.toml` dependencies.
3. Replace `create_all()`-on-startup with real Alembic migrations — the scaffold
   already exists at `backend/alembic/` (`env.py`, `script.py.mako`,
   `versions/.gitkeep`); generate an initial revision with
   `alembic revision --autogenerate -m "initial schema"` and run
   `alembic upgrade head` in CI/CD instead of relying on `OCIO_SEED_ON_STARTUP`.
4. Turn off `OCIO_SEED_ON_STARTUP` in any non-local environment; the seed script
   is meant for demo data only.

## 2. Identity: LocalDevAuthAdapter → Entra ID (Azure AD)

**Today**: `backend/app/core/auth.py` defines the `AuthAdapter` protocol
(`resolve(persona_header) -> PersonaProfile`, `list_personas()`).
`LocalDevAuthAdapter` trusts a plain `X-Persona` header — there is no token
validation, and this must never be deployed outside a local/demo environment.

**To swap in Entra ID**:
1. Implement a new adapter, e.g. `EntraIdAuthAdapter`, that:
   - Validates the incoming `Authorization: Bearer <JWT>` using MSAL / the
     `azure-identity` + `PyJWT`/`msal` libraries against your tenant's JWKS.
   - Maps validated Entra ID token claims (`oid`, `roles`/App Roles or group
     membership) to a `PersonaProfile` (persona_key, display_name, roles, email).
   - Raises `401`/`403` (via FastAPI `HTTPException`) for missing/invalid tokens
     instead of silently defaulting to a persona.
2. Populate `OCIO_ENTRA_TENANT_ID`, `OCIO_ENTRA_CLIENT_ID`,
   `OCIO_ENTRA_CLIENT_SECRET` in a real (never-committed) `.env`.
3. Update the dependency-injection wiring in `backend/app/api/deps.py` to
   construct `EntraIdAuthAdapter` instead of `LocalDevAuthAdapter` (e.g. gated by
   `OCIO_ENV != "local"`).
4. On the frontend, replace the persona `<Dropdown>` in `AppShell.tsx` and
   `PersonaContext.tsx` with MSAL.js sign-in (`@azure/msal-browser` /
   `@azure/msal-react`), acquiring a token and sending it as `Authorization:
   Bearer <token>` in `api/client.ts` instead of the `X-Persona` header.
5. Role mapping: today's 5 roles (`executive`, `manager`, `steward`,
   `publisher`, `admin`) are the RBAC vocabulary already used throughout
   `services/*` via `require_role()`. Map your Entra ID App Roles or security
   groups onto this same vocabulary so `require_role()` calls need no changes.

## 3. Analytics: PlaceholderPowerBIAdapter → real Power BI embedding

**Today**: `backend/app/core/powerbi.py` defines the `PowerBIEmbedAdapter`
protocol (`get_embed_info(report_key) -> EmbedInfo`).
`PlaceholderPowerBIAdapter` always returns `access_state="placeholder"` with an
explanatory message — the frontend's `AnalyticsPage.tsx` renders this as a
"Power BI not connected" `MessageBar` inside the embed dialog.

**To swap in real Power BI embedding**:
1. Implement `RealPowerBIEmbedAdapter.get_embed_info(report_key)` that:
   - Authenticates as a service principal against Azure AD (`azure-identity`'s
     `ClientSecretCredential`) using `OCIO_POWERBI_TENANT_ID` /
     `OCIO_POWERBI_CLIENT_ID` / `OCIO_POWERBI_CLIENT_SECRET`.
   - Calls the Power BI REST API
     (`GET /v1.0/myorg/groups/{workspaceId}/reports/{reportId}` and
     `POST .../GenerateToken`) to obtain an embed URL and a short-lived embed
     token.
   - Returns a populated `EmbedInfo` with `embed_mode="live"`,
     `access_state="connected"`, real `embed_url`/`token`/`expires_in_seconds`.
2. Maintain a mapping from the portal's internal `report_key` (see
   `services/analytics.py`'s report catalog) to real Power BI workspace/report
   GUIDs — likely a small config dict or table keyed by `report_key`.
3. Update `get_powerbi_adapter()` to return the real adapter when
   `OCIO_POWERBI_*` settings are present, falling back to the placeholder
   otherwise (useful for keeping local dev credential-free).
4. On the frontend, replace the placeholder `MessageBar` dialog in
   `AnalyticsPage.tsx` with the `powerbi-client` npm package's
   `<PowerBIEmbed>` component, feeding it the adapter's `embed_url` + `token`.

## General guidance for all three swaps

- Keep the adapter's **protocol/interface stable** — routes and services only
  depend on the protocol type, not the concrete class, so tests can keep using
  fakes/mocks and production code only changes at the factory function.
- Add adapter-specific tests (e.g. mock the Entra ID JWKS response, mock the
  Power BI REST API) rather than modifying the existing `services/*` unit tests.
- Never commit real secrets. `.env.example` documents every `OCIO_*`/`VITE_*`
  variable a production adapter would need; the actual `.env` must stay
  git-ignored (see [production-readiness.md](./production-readiness.md)).
