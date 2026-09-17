# Copilot / AI agent instructions for OCIO Portal

These instructions apply to any AI coding assistant (GitHub Copilot, agents,
etc.) working in this repository.

## Ground rules

- **This is a local prototype with synthetic data only.** Never introduce real
  credentials, real employee/customer data, or real API keys anywhere in the
  repo (including tests, seed data, `.env.example`, or comments). All seeded
  people/applications/platforms are fictional demo data.
- **Preserve the adapter boundaries.** `backend/app/core/auth.py`
  (`AuthAdapter`/`LocalDevAuthAdapter`) and `backend/app/core/powerbi.py`
  (`PowerBIEmbedAdapter`/`PlaceholderPowerBIAdapter`) exist specifically so
  identity and analytics providers can be swapped without touching routes or
  services. Do not bypass these interfaces by calling a real provider directly
  from a route or service — see [docs/enterprise-integration.md](../docs/enterprise-integration.md).
- **Keep routes thin.** `backend/app/api/routes/*` should only parse
  request/response models and delegate to `backend/app/services/*`. Business
  logic, RBAC checks (`require_role`), audit logging (`record_audit`), and
  optimistic-concurrency bumps (`bump_version`) belong in services, not routes.
- **Keep pages thin where practical.** Shared UI belongs in
  `frontend/src/components/common/*`; page-specific data fetching/mutations via
  TanStack Query belong in the page component itself, not buried in components.

## Type/strictness requirements

- Backend: Python type hints are required on all new functions; keep `ruff
  check backend` passing (run from repo root:
  `.venv\Scripts\python.exe -m ruff check backend`).
- Frontend: TypeScript strict mode is enabled, including
  `noPropertyAccessFromIndexSignature`. Keep `npm run typecheck` (in
  `frontend/`) passing. Do not add `any` casts to work around Fluent UI's
  Slot-typed `as` props — see the `AppLink` pattern in
  `frontend/src/components/common/AppLink.tsx` for the correct approach to
  router-integrated links.

## Testing requirements

- Any functional backend change (new endpoint, changed business logic, bug fix)
  must include or update a pytest test in `backend/tests/`. Run with
  `.venv\Scripts\python.exe -m pytest backend -q` from the repo root.
- Any functional frontend change should include or update a vitest test in
  `frontend/src/test/`. Run with `npm run test` in `frontend/`.
- Before considering a change complete, run lint + typecheck + tests + build
  for whichever side(s) you touched, and fix any failures.

## Data model changes

- New entities/fields go in `backend/app/models/entities.py` (SQLAlchemy ORM)
  and must have a matching Pydantic schema in `backend/app/schemas/domain.py`.
  Keep types portable to SQL Server (integer surrogate PKs, `Numeric` for
  decimals, timezone-aware `DateTime`) — see
  [docs/data-model.md](../docs/data-model.md).
- If you add a new mutable entity, use the existing
  `TimestampMixin`/`AuditUserMixin`/`VersionedMixin` mixins
  (`backend/app/models/mixins.py`) for consistency with optimistic concurrency
  and audit trails.
- Update `backend/app/db/seed.py` to keep seeding idempotent (running it twice
  must not create duplicates or error).

## Documentation

- Significant architectural changes should be reflected in
  [docs/architecture.md](../docs/architecture.md) and, if the schema changed,
  [docs/data-model.md](../docs/data-model.md) (including the Mermaid ER
  diagram).
