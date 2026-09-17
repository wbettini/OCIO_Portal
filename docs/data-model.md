# Data Model

22 tables (21 domain entities + the `user_profiles` persona table) live in
`backend/app/models/entities.py`. All tables use integer surrogate primary keys and
NUMERIC(precision, scale) for decimals, so the schema can be ported to SQL Server /
Azure SQL with no structural changes.

Mutable domain entities share three mixins (`backend/app/models/mixins.py`):

- **`TimestampMixin`** — `created_at` / `updated_at` (timezone-aware).
- **`AuditUserMixin`** — `created_by_persona_key` / `updated_by_persona_key`.
- **`VersionedMixin`** — integer `version` column used for optimistic concurrency.

## Entity-relationship diagram

```mermaid
erDiagram
    ORGANIZATION_UNIT ||--o{ TEAM : "has"
    ORGANIZATION_UNIT ||--o{ ORGANIZATION_UNIT : "parent of"
    ORGANIZATION_UNIT ||--o{ PERSON : "employs"
    TEAM ||--o{ PERSON : "staffs"

    PERSON ||--o{ PERSON_TEAM_ASSIGNMENT : ""
    TEAM ||--o{ PERSON_TEAM_ASSIGNMENT : ""

    PERSON ||--o{ PERSON_APPLICATION_ASSIGNMENT : ""
    APPLICATION ||--o{ PERSON_APPLICATION_ASSIGNMENT : ""
    PERSON ||--o{ APPLICATION : "owns"

    PERSON ||--o{ PERSON_PLATFORM_ASSIGNMENT : ""
    PLATFORM ||--o{ PERSON_PLATFORM_ASSIGNMENT : ""
    PERSON ||--o{ PLATFORM : "owns"

    PERSON ||--o{ PERSON_CAPABILITY : ""
    CAPABILITY ||--o{ PERSON_CAPABILITY : ""

    APPLICATION ||--o{ APPLICATION_PLATFORM_RELATIONSHIP : ""
    PLATFORM ||--o{ APPLICATION_PLATFORM_RELATIONSHIP : ""

    APPLICATION ||--o{ APPLICATION_CAPABILITY_REQUIREMENT : ""
    CAPABILITY ||--o{ APPLICATION_CAPABILITY_REQUIREMENT : ""

    ASSET ||--o{ ASSET_APPLICATION_RELATIONSHIP : ""
    APPLICATION ||--o{ ASSET_APPLICATION_RELATIONSHIP : ""
    PERSON ||--o{ ASSET : "owns"

    ATTESTATION_DEFINITION ||--o{ ATTESTATION_QUESTION : "has"
    ATTESTATION_DEFINITION ||--o{ ATTESTATION_CAMPAIGN : "runs as"
    ATTESTATION_CAMPAIGN ||--o{ ATTESTATION_ASSIGNMENT : "assigns"
    ATTESTATION_ASSIGNMENT ||--o{ ATTESTATION_RESPONSE : "collects"
    ATTESTATION_QUESTION ||--o{ ATTESTATION_RESPONSE : "answered by"

    ORGANIZATION_UNIT {
        int id PK
        string name
        string code
        string description
        int parent_id FK
    }
    TEAM {
        int id PK
        string name
        string description
        int org_unit_id FK
    }
    PERSON {
        int id PK
        string full_name
        string email
        string title
        string status
        string role_family
        date hire_date
        int org_unit_id FK
        int team_id FK
    }
    APPLICATION {
        int id PK
        string name
        string description
        string criticality
        string lifecycle_state
        int owner_person_id FK
    }
    PLATFORM {
        int id PK
        string name
        string platform_type
        int owner_person_id FK
        string lifecycle_state
        string support_status
        string strategic_classification
    }
    CAPABILITY {
        int id PK
        string name
        string category
        string description
        numeric target_coverage_percent
    }
    ASSET {
        int id PK
        string name
        string asset_type
        string lifecycle_state
        string risk_level
        date eol_date
        int owner_person_id FK
    }
    ANNOUNCEMENT {
        int id PK
        string title
        string body
        string status
        string priority
        bool featured
        datetime effective_at
        datetime expires_at
    }
    ATTESTATION_DEFINITION {
        int id PK
        string name
        string category
    }
    ATTESTATION_QUESTION {
        int id PK
        int definition_id FK
        string prompt
        string question_type
        bool required
        string options_json
        int order_index
    }
    ATTESTATION_CAMPAIGN {
        int id PK
        int definition_id FK
        string name
        datetime opens_at
        datetime closes_at
    }
    ATTESTATION_ASSIGNMENT {
        int id PK
        int campaign_id FK
        string assignee_persona_key
        string status
        bool acknowledgement
        datetime submitted_at
        datetime reviewed_at
        string reviewer_persona_key
    }
    ATTESTATION_RESPONSE {
        int id PK
        int assignment_id FK
        int question_id FK
        string answer_text
        bool answer_boolean
        numeric answer_numeric
        date answer_date
        string answer_choice
    }
    PERSON_TEAM_ASSIGNMENT {
        int id PK
        int person_id FK
        int team_id FK
        string role
        numeric allocation_percent
    }
    PERSON_APPLICATION_ASSIGNMENT {
        int id PK
        int person_id FK
        int application_id FK
        string role
        numeric allocation_percent
        date effective_end
    }
    PERSON_PLATFORM_ASSIGNMENT {
        int id PK
        int person_id FK
        int platform_id FK
        string role
        numeric allocation_percent
    }
    PERSON_CAPABILITY {
        int id PK
        int person_id FK
        int capability_id FK
        string role
    }
    APPLICATION_PLATFORM_RELATIONSHIP {
        int id PK
        int application_id FK
        int platform_id FK
    }
    APPLICATION_CAPABILITY_REQUIREMENT {
        int id PK
        int application_id FK
        int capability_id FK
    }
    ASSET_APPLICATION_RELATIONSHIP {
        int id PK
        int asset_id FK
        int application_id FK
    }
```

`AuditEvent` and `UserProfile` (personas) are intentionally omitted from the diagram
above — they aren't part of the core domain graph. `AuditEvent` is an
append-only log table (`entity_type`, `entity_id`, `action`, `actor_persona_key`,
`summary`, `created_at`) written by `services/common.py::record_audit()` on every
mutation. `UserProfile` seeds the 5 demo personas used by `LocalDevAuthAdapter`.

## Computed / derived fields

- `Capability.current_coverage` — not a column. Computed in
  `services/capabilities.py::_current_coverage()` from the ratio of people with a
  matching `PersonCapability` row vs. total headcount, and merged into the response
  via `SimpleNamespace` before Pydantic validation.
- `DashboardSummary.capability_coverage_percent` — average of all capabilities'
  computed coverage, in `services/dashboard.py`.
- Asset "approaching EOL" counts — computed on the fly from `Asset.eol_date` vs.
  `date.today() + N days`, both in `services/dashboard.py` (180-day KPI) and
  client-side in `AssetsPage.tsx` (90/180/365 day filters).

## Association ("relationship") entities

Six pure many-to-many association tables all share the same shape via
`_AssociationMixin` (`role`, `allocation_percent`, `effective_start`,
`effective_end`, plus the standard timestamp/audit/version mixins):
`PersonTeamAssignment`, `PersonApplicationAssignment`, `PersonPlatformAssignment`,
`PersonCapability`, `ApplicationPlatformRelationship`,
`ApplicationCapabilityRequirement`, `AssetApplicationRelationship` (7 total). This
uniform shape is what lets the Resource Planner's workforce/application/coverage
views compose person ↔ application ↔ platform ↔ capability data generically.
