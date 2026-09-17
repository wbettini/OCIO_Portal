# OCIO Portal

A locally runnable prototype of an Office of the CIO (OCIO) portal: workforce,
application, platform, asset/EOL, capability, resource-planning, attestation,
analytics, and administration management for a fictional technology
organization. **All data is synthetic demo data — there are no real people,
companies, credentials, or API keys anywhere in this repository.**

## What this is

- A **FastAPI + SQLAlchemy 2.x + SQLite** backend exposing a versioned REST API
  (`/api/v1`) over 21 domain entities (people, applications, platforms, assets,
  capabilities, attestations, announcements, and their many-to-many
  relationships), with RBAC, optimistic concurrency, and audit logging built in,
  including full create/update/delete management of attestation campaigns.
- A **React 18 + TypeScript (strict) + Vite 5 + Fluent UI v9** single-page
  frontend covering 11 pages/routes, using TanStack Query for data fetching and
  React Hook Form + Zod where forms need validation.
- Five fixed **demo personas** (no real login) selectable from the header,
  driving both what data mutations are permitted (RBAC) and which attestations
  show up as "mine".
- Two **swappable integration seams** — identity (`AuthAdapter`) and analytics
  embedding (`PowerBIEmbedAdapter`) — implemented today as local
  placeholders, with a real Entra ID / Power BI implementation description in
  [docs/enterprise-integration.md](docs/enterprise-integration.md).

See [docs/architecture.md](docs/architecture.md) for the full architecture,
[docs/data-model.md](docs/data-model.md) for the entity-relationship diagram,
and [docs/production-readiness.md](docs/production-readiness.md) for a
checklist of what would need to change before any real deployment.

## Repository layout

```
OCIO_Portal/
├── .env.example                  # all OCIO_*/VITE_* env vars documented
├── .github/
│   └── copilot-instructions.md   # AI agent working agreement for this repo
├── docs/
│   ├── architecture.md
│   ├── data-model.md             # includes Mermaid ER diagram
│   ├── enterprise-integration.md # SQL Server / Entra ID / Power BI swap guide
│   └── production-readiness.md
├── package.json                  # root orchestrator (concurrently runs both apps)
├── backend/
│   ├── alembic/                  # migration scaffold (not yet used; create_all() today)
│   ├── app/
│   │   ├── main.py               # app factory, lifespan/seed, CORS, error envelope
│   │   ├── core/
│   │   │   ├── auth.py           # AuthAdapter / LocalDevAuthAdapter + 5 personas
│   │   │   ├── config.py
│   │   │   └── powerbi.py        # PowerBIEmbedAdapter / PlaceholderPowerBIAdapter
│   │   ├── db/
│   │   │   ├── base.py, engine.py, session.py
│   │   │   └── seed.py           # idempotent demo data seeding
│   │   ├── models/
│   │   │   ├── entities.py       # all 21+1 SQLAlchemy ORM models
│   │   │   └── mixins.py         # Timestamp/AuditUser/Versioned mixins
│   │   ├── schemas/
│   │   │   ├── common.py, domain.py   # Pydantic v2 request/response models
│   │   ├── services/             # business logic, one module per domain
│   │   │   ├── common.py, workforce.py, applications.py, platforms.py,
│   │   │   │   capabilities.py, assets.py, announcements.py, attestations.py,
│   │   │   │   planner.py, analytics.py, dashboard.py, audit.py
│   │   └── api/
│   │       ├── deps.py, router.py
│   │       └── routes/           # thin route handlers, one module per domain
│   ├── tests/                    # pytest suite (25 tests)
│   └── pyproject.toml            # ruff + pytest config, package deps
└── frontend/
    ├── src/
    │   ├── main.tsx, App.tsx     # router setup, providers
    │   ├── api/                  # client.ts (fetch wrapper) + endpoints.ts
    │   ├── context/              # PersonaContext
    │   ├── components/
    │   │   ├── common/           # AppLink, SectionCard, KpiCard, etc.
    │   │   └── shell/            # AppShell (header/nav/breadcrumb)
    │   ├── pages/                # 11 routed pages (Home, Workforce, ... , Administration)
    │   └── test/                 # setup.ts, test-utils.tsx, App.test.tsx (vitest)
    ├── package.json
    └── vite.config.ts
```

## Prerequisites

- **Node.js 18+** and npm.
- **Python 3.11 (64-bit)** — a 64-bit interpreter is required; if a 32-bit
  Python is on `PATH`, some wheel installs (SQLAlchemy/uvicorn) will fail or be
  unexpectedly slow. On Windows, check with:
  ```powershell
  python -c "import struct; print(struct.calcsize('P') * 8)"
  ```
  If that prints `32`, install/point to a 64-bit Python 3.11 explicitly (this
  repo's own `.venv` was created from
  `C:\Users\<you>\AppData\Local\Programs\Python\Python311\python.exe`).
- PowerShell (all commands below are written for `pwsh`/Windows PowerShell).

## Setup

From the repo root:

```powershell
# 1. Backend: create venv and install (editable, with dev extras)
py -3.11-64 -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -e "./backend[dev]"

# 2. Frontend + root orchestrator dependencies
npm install
npm install --prefix frontend

# 3. Copy env template (optional for local SQLite — defaults already work)
Copy-Item .env.example .env
```

## Running

The easiest way to start everything is the root `start.ps1` script, which
verifies prerequisites (venv, `node_modules`, `.env`) and then runs both apps:

```powershell
./start.ps1

# Optionally hide the "Local Prototype Mode" / "Demonstration Data" pills
# and banners in the frontend UI (useful for screenshots/demos):
./start.ps1 -HideDemoLabels
```

Equivalently, you can drive the npm scripts directly:

```powershell
# Start both backend (port 8000) and frontend (port 5173) together:
npm run dev

# ...or individually:
npm run dev:backend    # FastAPI + uvicorn --reload on http://localhost:8000
npm run dev:frontend   # Vite dev server on http://localhost:5173
```

The backend seeds demo data automatically on startup
(`OCIO_SEED_ON_STARTUP=true`); seeding is idempotent, so restarting never
duplicates data. To seed manually: `npm run seed`.

**Local URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1
- Interactive API docs (Swagger UI, auto-generated by FastAPI): http://localhost:8000/docs

## Personas

Select a persona from the header dropdown — it's sent as an `X-Persona` header
and drives both RBAC and "my attestations" filtering. No password/login is
required (see [docs/enterprise-integration.md](docs/enterprise-integration.md)
for how a real Entra ID login would replace this).

| Persona key | Display name  | Title              | Roles                                        |
|-------------|---------------|---------------------------|-----------------------------------------------|
| `executive` | Alex Rivera   | CIO                  | executive, viewer                              |
| `manager`   | Priya Shah    | Technology Manager   | manager, viewer                                |
| `steward`   | Jordan Chen   | Data Steward         | steward, viewer                                |
| `publisher` | Sam Patel     | Content Publisher    | publisher, viewer                              |
| `admin`     | Morgan Lee    | Portal Administrator | admin, manager, steward, publisher, viewer     |

## Commands reference

Run from the repo root unless noted.

| Purpose                     | Command                                              |
|------------------------------|-------------------------------------------------------|
| Start everything (checked)   | `./start.ps1` (add `-HideDemoLabels` to hide demo pills) |
| Run both apps                | `npm run dev`                                        |
| Backend lint (ruff)           | `.venv\Scripts\python.exe -m ruff check backend`     |
| Backend tests (pytest)        | `.venv\Scripts\python.exe -m pytest backend -q`      |
| Seed demo data manually       | `npm run seed`                                        |
| Frontend typecheck            | `npm run typecheck` (from `frontend/`)                |
| Frontend tests (vitest)       | `npm run test` (from `frontend/`)                     |
| Frontend production build     | `npm run build` (from `frontend/`)                    |

## Verified results (this build)

- **Backend lint**: `ruff check backend` — All checks passed.
- **Backend tests**: `pytest backend -q` — **25 passed** (incl. attestation
  campaign create/update/delete and RBAC/conflict checks).
- **Frontend typecheck**: `tsc -b --noEmit` — no errors (strict mode incl.
  `noPropertyAccessFromIndexSignature`).
- **Frontend tests**: `vitest run` — **4 passed** (shell chrome + KPIs render,
  side-nav navigation, attestation question form rendering).
- **Frontend build**: succeeds — main JS bundle 783.79 kB (gzip 223.05 kB); Vite
  emits a non-blocking chunk-size warning (>500 kB) — see
  [docs/production-readiness.md](docs/production-readiness.md) for the
  code-splitting recommendation.
- **Live smoke test**: every page (Home, Workforce, Applications, Platforms,
  Assets, Capabilities, Resource Planner — all 3 tabs, Attestations incl. the
  detail/draft workflow, Analytics incl. the Power BI placeholder dialog,
  Administration) was manually exercised against both dev servers with real
  seeded data and confirmed working end-to-end.

## Decisions & known limitations

- **SQLite instead of SQL Server**: chosen for a zero-install local prototype;
  the schema uses SQL-Server-portable types throughout (see
  [docs/data-model.md](docs/data-model.md)) and the swap path is documented in
  [docs/enterprise-integration.md](docs/enterprise-integration.md).
- **`LocalDevAuthAdapter` instead of Entra ID**: trusts a plain `X-Persona`
  header with zero token validation — appropriate only for local/demo use, and
  must be replaced before any real deployment.
- **`PlaceholderPowerBIAdapter` instead of live Power BI embedding**: the
  Analytics page renders a real report catalog and dialog UX, but always shows
  "not connected" rather than an embedded report.
- **Schema managed via `create_all()`, not Alembic migrations yet**: an Alembic
  scaffold exists at `backend/alembic/` but is not wired into startup; real
  deployments should generate and apply migrations instead.
- **npm audit findings not force-fixed**: `npm install` in `frontend/` reports
  7 vulnerabilities (5 moderate, 1 high, 1 critical) in transitive
  build/dev dependencies. Left as-is to avoid destabilizing the toolchain
  during this prototype build; triage before production use.
- **Single JS bundle, not yet code-split**: acceptable for a local prototype,
  but should be addressed (route-based `React.lazy()`) before a real rollout.

## Next three highest-value improvements

1. **Code-split the frontend bundle** by route (`React.lazy()` +
   `Suspense`) to eliminate the >500 kB chunk-size warning and improve initial
   load time — the highest-leverage, lowest-risk frontend change available.
2. **Add end-to-end tests** (Playwright/Cypress) for the multi-step flows only
   currently verified by manual smoke-testing: attestation draft → submit →
   review, resource planner assignment creation, and capability coverage
   recompute after a `PersonCapability` change — this is the biggest gap
   between "unit tests pass" and "the product actually works."
3. **Wire Alembic migrations into the startup/deploy path** in place of
   `create_all()`, and add a CI pipeline running lint + typecheck + tests +
   build on every change — both are prerequisites for evolving the schema
   safely once more than one developer is working against this codebase.
