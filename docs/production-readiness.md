# Production Readiness Checklist

This prototype is intentionally credential-free and local-only. Before any real
deployment, work through the following.

## Security

- [ ] Replace `LocalDevAuthAdapter` with a real identity provider integration
      (see [enterprise-integration.md](./enterprise-integration.md)). The
      `X-Persona` header trust model **must never** reach a non-local environment.
- [ ] Add real authorization checks at the gateway/network layer in addition to
      the in-process `require_role()` checks — defense in depth.
- [ ] Serve over HTTPS/TLS only; set `Secure`, `HttpOnly`, `SameSite` on any
      session cookies introduced by a real auth adapter.
- [ ] Tighten `OCIO_CORS_ORIGINS` to the exact production frontend origin(s) —
      the local default (`localhost:5173`) must not ship to production.
- [ ] Run `npm audit fix` (or equivalent) — the frontend `npm install` currently
      reports 7 vulnerabilities (5 moderate, 1 high, 1 critical) in transitive
      dev/build dependencies that were not force-fixed in this prototype to
      avoid destabilizing the toolchain; triage and patch before shipping.
- [ ] Add request size limits, rate limiting, and structured audit-log shipping
      (the in-app `AuditEvent` table is a good source but should also be
      exported to a durable/immutable store in production).
- [ ] Validate all `Announcement.body` rendering stays plain-text (already the
      case in `AdministrationPage.tsx` — no `dangerouslySetInnerHTML`) to avoid
      stored XSS; keep this invariant if announcement content ever supports rich
      text.

## Data & persistence

- [ ] Swap SQLite for SQL Server/Azure SQL (or Postgres) and switch from
      `create_all()` to Alembic-managed migrations (scaffold already present at
      `backend/alembic/`).
- [ ] Turn off `OCIO_SEED_ON_STARTUP` outside local/demo environments.
- [ ] Add DB connection pooling tuned for the target environment, and
      backup/restore + point-in-time-recovery procedures.
- [ ] Review cascade/delete behavior for the 7 association tables — the
      prototype does not define `ON DELETE CASCADE`; decide the real referential
      integrity policy before production use.

## Observability

- [ ] Replace the basic `OCIO_LOG_LEVEL`-driven console logging with structured
      logging (e.g. JSON logs) shipped to a central log/metrics platform.
- [ ] Add request tracing (e.g. OpenTelemetry) across frontend → API → DB.
- [ ] Add health/readiness probes beyond the existing `/api/v1/health` route as
      required by the target orchestrator (Kubernetes liveness/readiness, etc.).
- [ ] Alert on `AuditEvent` anomalies (e.g. spikes in `delete`/`update` actions).

## Frontend

- [ ] Code-split the production bundle — `npm run build` currently emits a
      single ~784 kB (gzip ~223 kB) JS chunk with a Vite chunk-size warning.
      Introduce route-based `React.lazy()`/dynamic `import()` per page.
- [ ] Add end-to-end tests (Playwright/Cypress) covering the cross-page flows
      exercised manually during this build (attestation draft → submit → review,
      planner assign, capabilities coverage) — current automated coverage is
      backend pytest (unit/integration) + a handful of frontend component tests.
- [ ] Add a Content Security Policy and other standard security headers at the
      hosting layer (the Vite dev server does not set these).

## API surface

- [ ] Add pagination limits/guards consistently (services already paginate list
      endpoints — confirm max `page_size` is enforced everywhere).
- [ ] Add idempotency keys or stronger concurrency tests around the optimistic
      `version` column for high-contention entities (e.g. attestation
      assignments during a submit/review race).
- [ ] Version the API path (already `/api/v1`) and define a deprecation policy
      before introducing `/api/v2`.

## Process

- [ ] Wire `ruff check`, `pytest`, `npm run typecheck`, `npm run test`, and
      `npm run build` into CI, failing the build on any regression.
- [ ] Add Dependabot/Renovate for both `backend/pyproject.toml` and
      `frontend/package.json`.
- [ ] Document a real on-call/runbook process once this moves beyond prototype
      status.
