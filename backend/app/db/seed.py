"""Idempotent demo data seeding for OCIO Portal.

Run via `python -m app.db.seed`. Safe to run multiple times: existing rows
are matched on natural keys and left untouched; only missing rows are
created. All data is clearly synthetic / demo-labelled.
"""
from __future__ import annotations

import datetime as dt
from typing import Any, TypeVar

from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.engine import engine
from app.db.session import SessionLocal
from app.models.entities import (
    Announcement,
    Application,
    ApplicationCapabilityRequirement,
    ApplicationPlatformRelationship,
    Asset,
    AssetApplicationRelationship,
    AttestationAssignment,
    AttestationCampaign,
    AttestationDefinition,
    AttestationQuestion,
    Capability,
    OrganizationUnit,
    Person,
    PersonApplicationAssignment,
    PersonCapability,
    PersonPlatformAssignment,
    PersonTeamAssignment,
    Platform,
    Team,
    UserProfile,
)
from app.services.common import json_dumps

ModelT = TypeVar("ModelT", bound=Base)

SEED_ACTOR = "seed-script"
TODAY = dt.date.today()


def get_or_create(
    db: Session, model: type[ModelT], match: dict[str, Any], defaults: dict[str, Any] | None = None
) -> ModelT:
    """Fetch a row matching the natural key `match`, or create it with
    `match` merged with `defaults`. Existing rows are never overwritten.
    """
    stmt_filters = [getattr(model, key) == value for key, value in match.items()]
    existing = db.query(model).filter(*stmt_filters).one_or_none()
    if existing is not None:
        return existing

    payload = {**match, **(defaults or {})}
    instance = model(**payload)
    db.add(instance)
    db.flush()
    return instance


def _seed_personas(db: Session) -> None:
    personas = [
        ("executive", "Alex Rivera", "CIO", "executive,viewer", "alex.rivera@demo.ocio.local"),
        (
            "manager",
            "Priya Shah",
            "Technology Manager",
            "manager,viewer",
            "priya.shah@demo.ocio.local",
        ),
        (
            "steward",
            "Jordan Chen",
            "Data Steward",
            "steward,viewer",
            "jordan.chen@demo.ocio.local",
        ),
        (
            "publisher",
            "Sam Patel",
            "Content Publisher",
            "publisher,viewer",
            "sam.patel@demo.ocio.local",
        ),
        (
            "admin",
            "Morgan Lee",
            "Portal Administrator",
            "admin,manager,steward,publisher,viewer",
            "morgan.lee@demo.ocio.local",
        ),
    ]
    for persona_key, display_name, title, roles_csv, email in personas:
        get_or_create(
            db,
            UserProfile,
            {"persona_key": persona_key},
            {
                "display_name": display_name,
                "title": title,
                "roles_csv": roles_csv,
                "email": email,
                "is_active": True,
            },
        )


def _seed_org(db: Session) -> tuple[dict[str, OrganizationUnit], dict[str, Team]]:
    org_units_spec = [
        ("Office of the CIO", "OCIO"),
        ("Technology Operations", "TECHOPS"),
        ("Enterprise Applications", "ENTAPP"),
        ("Data & Analytics", "DATA"),
        ("Information Security", "INFOSEC"),
    ]
    org_units: dict[str, OrganizationUnit] = {}
    for name, code in org_units_spec:
        org_units[code] = get_or_create(
            db,
            OrganizationUnit,
            {"code": code},
            {"name": name, "description": f"{name} (demo org unit)", "created_by": SEED_ACTOR, "updated_by": SEED_ACTOR},
        )

    teams_spec = [
        ("Platform Engineering", "TECHOPS"),
        ("Service Reliability", "TECHOPS"),
        ("Core Banking Apps", "ENTAPP"),
        ("Digital Channels", "ENTAPP"),
        ("Analytics & BI", "DATA"),
        ("Data Governance", "DATA"),
        ("Security Operations", "INFOSEC"),
        ("Executive Office", "OCIO"),
    ]
    teams: dict[str, Team] = {}
    for name, org_code in teams_spec:
        teams[name] = get_or_create(
            db,
            Team,
            {"name": name},
            {
                "org_unit_id": org_units[org_code].id,
                "description": f"{name} (demo team)",
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )
    return org_units, teams


def _seed_people(
    db: Session, org_units: dict[str, OrganizationUnit], teams: dict[str, Team]
) -> dict[str, Person]:
    people_spec = [
        ("Alex Rivera", "alex.rivera@demo.ocio.local", "CIO", "Executive", "Executive Office"),
        ("Priya Shah", "priya.shah@demo.ocio.local", "Technology Manager", "Manager", "Platform Engineering"),
        ("Jordan Chen", "jordan.chen@demo.ocio.local", "Data Steward", "Steward", "Data Governance"),
        ("Sam Patel", "sam.patel@demo.ocio.local", "Content Publisher", "Publisher", "Executive Office"),
        ("Morgan Lee", "morgan.lee@demo.ocio.local", "Portal Administrator", "Administrator", "Executive Office"),
        ("Dana Whitfield", "dana.whitfield@demo.ocio.local", "Principal Engineer", "Engineer", "Platform Engineering"),
        ("Kai Nakamura", "kai.nakamura@demo.ocio.local", "Site Reliability Lead", "Engineer", "Service Reliability"),
        ("Leah Fischer", "leah.fischer@demo.ocio.local", "Senior Software Engineer", "Engineer", "Core Banking Apps"),
        ("Marcus Yoon", "marcus.yoon@demo.ocio.local", "Software Engineer", "Engineer", "Digital Channels"),
        ("Renee Castillo", "renee.castillo@demo.ocio.local", "BI Developer", "Analyst", "Analytics & BI"),
        ("Owen Whitaker", "owen.whitaker@demo.ocio.local", "Data Governance Analyst", "Analyst", "Data Governance"),
        ("Farah Haidari", "farah.haidari@demo.ocio.local", "Security Engineer", "Engineer", "Security Operations"),
        ("Theo Bergman", "theo.bergman@demo.ocio.local", "Application Support Lead", "Manager", "Core Banking Apps"),
        ("Nina Kowalski", "nina.kowalski@demo.ocio.local", "Product Manager", "Manager", "Digital Channels"),
        ("Ibrahim Osei", "ibrahim.osei@demo.ocio.local", "Cloud Platform Engineer", "Engineer", "Platform Engineering"),
        ("Grace Lindqvist", "grace.lindqvist@demo.ocio.local", "Data Analyst", "Analyst", "Analytics & BI"),
        ("Victor Alvim", "victor.alvim@demo.ocio.local", "Security Analyst", "Analyst", "Security Operations"),
    ]
    people: dict[str, Person] = {}
    for full_name, email, title, role_family, team_name in people_spec:
        team = teams[team_name]
        people[full_name] = get_or_create(
            db,
            Person,
            {"email": email},
            {
                "full_name": full_name,
                "title": title,
                "status": "Active",
                "role_family": role_family,
                "hire_date": TODAY - dt.timedelta(days=365 * 2),
                "org_unit_id": team.org_unit_id,
                "team_id": team.id,
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )
    return people


def _seed_applications(db: Session, people: dict[str, Person]) -> dict[str, Application]:
    apps_spec = [
        ("Core Ledger System", "System of record for general ledger postings.", "Critical", "Active", "Theo Bergman"),
        ("Payments Gateway", "Processes inbound/outbound payment instructions.", "Critical", "Active", "Leah Fischer"),
        ("Digital Banking Portal", "Customer-facing web banking experience.", "High", "Active", "Nina Kowalski"),
        ("Mobile Banking App", "Customer-facing mobile banking experience.", "High", "Active", "Marcus Yoon"),
        ("Loan Origination System", "Handles consumer and commercial loan intake.", "High", "Active", None),
        ("Fraud Detection Engine", "Real-time transaction fraud scoring.", "Critical", "Active", "Farah Haidari"),
        ("Regulatory Reporting Suite", "Produces regulatory filings.", "High", "Active", None),
        ("Enterprise Data Warehouse", "Central analytics data platform.", "High", "Active", "Renee Castillo"),
        ("HR Case Management", "Internal HR ticketing and case tracking.", "Medium", "Active", None),
        ("Legacy Branch Teller System", "Older in-branch teller workstation app.", "Medium", "Sunset", "Theo Bergman"),
        ("Vendor Risk Portal", "Third-party risk assessment workflows.", "Medium", "Active", "Owen Whitaker"),
    ]
    applications: dict[str, Application] = {}
    for name, description, criticality, lifecycle_state, owner_name in apps_spec:
        owner = people.get(owner_name) if owner_name else None
        applications[name] = get_or_create(
            db,
            Application,
            {"name": name},
            {
                "description": description,
                "criticality": criticality,
                "lifecycle_state": lifecycle_state,
                "owner_person_id": owner.id if owner else None,
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )
    return applications


def _seed_platforms(db: Session, people: dict[str, Person]) -> dict[str, Platform]:
    platforms_spec = [
        ("Azure Kubernetes Service", "Container Platform", "Ibrahim Osei", "Active", "Supported", "Strategic"),
        ("On-Prem VMware Cluster", "Virtualization", "Dana Whitfield", "Active", "Supported", "Tactical"),
        ("Mainframe z/OS", "Mainframe", "Theo Bergman", "Active", "Supported", "Legacy"),
        ("Snowflake Data Cloud", "Data Platform", "Renee Castillo", "Active", "Supported", "Strategic"),
        ("Azure SQL Managed Instance", "Database", "Dana Whitfield", "Active", "Supported", "Strategic"),
        ("Enterprise Service Bus", "Integration", "Kai Nakamura", "Active", "Supported", "Tactical"),
        ("Splunk Observability", "Observability", "Kai Nakamura", "Active", "Supported", "Strategic"),
        ("Legacy AS/400 Midrange", "Midrange", None, "Sunset", "Limited", "Legacy"),
    ]
    platforms: dict[str, Platform] = {}
    for name, ptype, owner_name, lifecycle_state, support_status, strategic in platforms_spec:
        owner = people.get(owner_name) if owner_name else None
        platforms[name] = get_or_create(
            db,
            Platform,
            {"name": name},
            {
                "platform_type": ptype,
                "owner_person_id": owner.id if owner else None,
                "lifecycle_state": lifecycle_state,
                "support_status": support_status,
                "strategic_classification": strategic,
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )
    return platforms


def _seed_capabilities(db: Session) -> dict[str, Capability]:
    capabilities_spec = [
        ("Cloud Infrastructure Engineering", "Engineering", 85),
        ("Site Reliability Engineering", "Engineering", 80),
        ("Application Security", "Security", 90),
        ("Data Governance", "Data", 75),
        ("Business Intelligence Development", "Data", 70),
        ("Payments Processing Expertise", "Domain", 85),
        ("Regulatory Reporting Expertise", "Domain", 80),
        ("Cloud Database Administration", "Engineering", 75),
        ("Fraud & Risk Analytics", "Data", 70),
        ("Legacy Mainframe Support", "Engineering", 60),
        ("Product Management", "Delivery", 70),
    ]
    capabilities: dict[str, Capability] = {}
    for name, category, target in capabilities_spec:
        capabilities[name] = get_or_create(
            db,
            Capability,
            {"name": name},
            {
                "category": category,
                "description": f"{name} (demo capability)",
                "target_coverage_percent": target,
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )
    return capabilities


def _seed_assets(db: Session, people: dict[str, Person]) -> dict[str, Asset]:
    assets_spec = [
        ("Core Ledger DB Cluster", "Database", "Active", "Low", TODAY + dt.timedelta(days=900), "Dana Whitfield"),
        ("Payments HSM Appliance", "Hardware", "Active", "Medium", TODAY + dt.timedelta(days=400), "Kai Nakamura"),
        ("Digital Portal Web Tier", "Compute", "Active", "Low", TODAY + dt.timedelta(days=700), "Ibrahim Osei"),
        ("Mobile App Build Pipeline", "Tooling", "Active", "Low", TODAY + dt.timedelta(days=600), "Marcus Yoon"),
        ("Fraud Engine Scoring Cluster", "Compute", "Active", "Medium", TODAY + dt.timedelta(days=150), "Farah Haidari"),
        ("Regulatory Reporting ETL Servers", "Compute", "Active", "Medium", TODAY + dt.timedelta(days=120), "Renee Castillo"),
        ("Enterprise Data Warehouse Storage", "Storage", "Active", "Low", TODAY + dt.timedelta(days=500), "Renee Castillo"),
        ("Branch Teller Workstations", "Hardware", "Sunset", "High", TODAY + dt.timedelta(days=60), "Theo Bergman"),
        ("Vendor Risk Portal App Servers", "Compute", "Active", "Medium", TODAY + dt.timedelta(days=300), "Owen Whitaker"),
        ("Legacy AS/400 Midrange Box", "Hardware", "Unsupported", "Critical", TODAY - dt.timedelta(days=200), None),
        ("Old Branch Print Servers", "Hardware", "Unsupported", "High", TODAY - dt.timedelta(days=45), None),
        ("Mainframe Storage Array", "Storage", "Active", "Medium", TODAY + dt.timedelta(days=800), "Theo Bergman"),
    ]
    assets: dict[str, Asset] = {}
    for name, asset_type, lifecycle_state, risk_level, eol_date, owner_name in assets_spec:
        owner = people.get(owner_name) if owner_name else None
        assets[name] = get_or_create(
            db,
            Asset,
            {"name": name},
            {
                "asset_type": asset_type,
                "lifecycle_state": lifecycle_state,
                "risk_level": risk_level,
                "eol_date": eol_date,
                "owner_person_id": owner.id if owner else None,
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )
    return assets


def _seed_relationships(
    db: Session,
    people: dict[str, Person],
    teams: dict[str, Team],
    applications: dict[str, Application],
    platforms: dict[str, Platform],
    capabilities: dict[str, Capability],
    assets: dict[str, Asset],
) -> None:
    # Person <-> Team
    person_team_pairs = [
        ("Dana Whitfield", "Platform Engineering", "Lead"),
        ("Kai Nakamura", "Service Reliability", "Lead"),
        ("Leah Fischer", "Core Banking Apps", "Contributor"),
        ("Marcus Yoon", "Digital Channels", "Contributor"),
        ("Renee Castillo", "Analytics & BI", "Contributor"),
        ("Owen Whitaker", "Data Governance", "Contributor"),
        ("Farah Haidari", "Security Operations", "Contributor"),
        ("Ibrahim Osei", "Platform Engineering", "Contributor"),
    ]
    for person_name, team_name, role in person_team_pairs:
        get_or_create(
            db,
            PersonTeamAssignment,
            {"person_id": people[person_name].id, "team_id": teams[team_name].id},
            {
                "role": role,
                "allocation_percent": 100,
                "effective_start": TODAY - dt.timedelta(days=365),
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )

    # Person <-> Application
    person_app_pairs = [
        ("Theo Bergman", "Core Ledger System", "Owner"),
        ("Leah Fischer", "Payments Gateway", "Lead Developer"),
        ("Nina Kowalski", "Digital Banking Portal", "Product Manager"),
        ("Marcus Yoon", "Mobile Banking App", "Lead Developer"),
        ("Farah Haidari", "Fraud Detection Engine", "Security Lead"),
        ("Renee Castillo", "Enterprise Data Warehouse", "Data Lead"),
        ("Owen Whitaker", "Vendor Risk Portal", "Governance Lead"),
        ("Theo Bergman", "Legacy Branch Teller System", "Owner"),
    ]
    for person_name, app_name, role in person_app_pairs:
        get_or_create(
            db,
            PersonApplicationAssignment,
            {"person_id": people[person_name].id, "application_id": applications[app_name].id},
            {
                "role": role,
                "allocation_percent": 50,
                "effective_start": TODAY - dt.timedelta(days=300),
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )
    # One expired assignment to surface a coverage alert
    get_or_create(
        db,
        PersonApplicationAssignment,
        {"person_id": people["Grace Lindqvist"].id, "application_id": applications["HR Case Management"].id},
        {
            "role": "Analyst",
            "allocation_percent": 25,
            "effective_start": TODAY - dt.timedelta(days=400),
            "effective_end": TODAY - dt.timedelta(days=30),
            "created_by": SEED_ACTOR,
            "updated_by": SEED_ACTOR,
        },
    )

    # Person <-> Platform
    person_platform_pairs = [
        ("Ibrahim Osei", "Azure Kubernetes Service", "Platform Engineer"),
        ("Dana Whitfield", "On-Prem VMware Cluster", "Platform Engineer"),
        ("Theo Bergman", "Mainframe z/OS", "Platform Owner"),
        ("Renee Castillo", "Snowflake Data Cloud", "Data Platform Lead"),
        ("Dana Whitfield", "Azure SQL Managed Instance", "DBA"),
        ("Kai Nakamura", "Enterprise Service Bus", "Integration Lead"),
        ("Kai Nakamura", "Splunk Observability", "Observability Lead"),
    ]
    for person_name, platform_name, role in person_platform_pairs:
        get_or_create(
            db,
            PersonPlatformAssignment,
            {"person_id": people[person_name].id, "platform_id": platforms[platform_name].id},
            {
                "role": role,
                "allocation_percent": 50,
                "effective_start": TODAY - dt.timedelta(days=300),
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )

    # Person <-> Capability
    person_capability_pairs = [
        ("Ibrahim Osei", "Cloud Infrastructure Engineering"),
        ("Dana Whitfield", "Cloud Infrastructure Engineering"),
        ("Kai Nakamura", "Site Reliability Engineering"),
        ("Farah Haidari", "Application Security"),
        ("Victor Alvim", "Application Security"),
        ("Owen Whitaker", "Data Governance"),
        ("Renee Castillo", "Business Intelligence Development"),
        ("Grace Lindqvist", "Business Intelligence Development"),
        ("Leah Fischer", "Payments Processing Expertise"),
        ("Theo Bergman", "Regulatory Reporting Expertise"),
        ("Dana Whitfield", "Cloud Database Administration"),
        ("Farah Haidari", "Fraud & Risk Analytics"),
        ("Theo Bergman", "Legacy Mainframe Support"),
        ("Nina Kowalski", "Product Management"),
    ]
    for person_name, capability_name in person_capability_pairs:
        get_or_create(
            db,
            PersonCapability,
            {"person_id": people[person_name].id, "capability_id": capabilities[capability_name].id},
            {
                "role": "Practitioner",
                "effective_start": TODAY - dt.timedelta(days=300),
                "created_by": SEED_ACTOR,
                "updated_by": SEED_ACTOR,
            },
        )

    # Application <-> Platform
    app_platform_pairs = [
        ("Core Ledger System", "Mainframe z/OS"),
        ("Payments Gateway", "Azure Kubernetes Service"),
        ("Digital Banking Portal", "Azure Kubernetes Service"),
        ("Mobile Banking App", "Azure Kubernetes Service"),
        ("Fraud Detection Engine", "Azure SQL Managed Instance"),
        ("Enterprise Data Warehouse", "Snowflake Data Cloud"),
        ("Legacy Branch Teller System", "Mainframe z/OS"),
        ("Regulatory Reporting Suite", "Snowflake Data Cloud"),
    ]
    for app_name, platform_name in app_platform_pairs:
        get_or_create(
            db,
            ApplicationPlatformRelationship,
            {"application_id": applications[app_name].id, "platform_id": platforms[platform_name].id},
            {"role": "Hosts", "created_by": SEED_ACTOR, "updated_by": SEED_ACTOR},
        )

    # Application <-> Capability requirement
    app_capability_pairs = [
        ("Core Ledger System", "Legacy Mainframe Support"),
        ("Payments Gateway", "Payments Processing Expertise"),
        ("Digital Banking Portal", "Product Management"),
        ("Fraud Detection Engine", "Fraud & Risk Analytics"),
        ("Enterprise Data Warehouse", "Business Intelligence Development"),
        ("Regulatory Reporting Suite", "Regulatory Reporting Expertise"),
        ("Vendor Risk Portal", "Data Governance"),
    ]
    for app_name, capability_name in app_capability_pairs:
        get_or_create(
            db,
            ApplicationCapabilityRequirement,
            {"application_id": applications[app_name].id, "capability_id": capabilities[capability_name].id},
            {"role": "Required", "created_by": SEED_ACTOR, "updated_by": SEED_ACTOR},
        )

    # Asset <-> Application
    asset_app_pairs = [
        ("Core Ledger DB Cluster", "Core Ledger System"),
        ("Payments HSM Appliance", "Payments Gateway"),
        ("Digital Portal Web Tier", "Digital Banking Portal"),
        ("Mobile App Build Pipeline", "Mobile Banking App"),
        ("Fraud Engine Scoring Cluster", "Fraud Detection Engine"),
        ("Regulatory Reporting ETL Servers", "Regulatory Reporting Suite"),
        ("Enterprise Data Warehouse Storage", "Enterprise Data Warehouse"),
        ("Branch Teller Workstations", "Legacy Branch Teller System"),
        ("Vendor Risk Portal App Servers", "Vendor Risk Portal"),
        ("Legacy AS/400 Midrange Box", "Legacy Branch Teller System"),
        ("Mainframe Storage Array", "Core Ledger System"),
    ]
    for asset_name, app_name in asset_app_pairs:
        get_or_create(
            db,
            AssetApplicationRelationship,
            {"asset_id": assets[asset_name].id, "application_id": applications[app_name].id},
            {"role": "Supports", "created_by": SEED_ACTOR, "updated_by": SEED_ACTOR},
        )


def _seed_announcements(db: Session) -> None:
    get_or_create(
        db,
        Announcement,
        {"title": "Welcome to the OCIO Portal"},
        {
            "body": (
                "This local prototype showcases the OCIO Portal experience using entirely "
                "synthetic demonstration data. No production systems are connected."
            ),
            "status": "Published",
            "priority": "High",
            "featured": True,
            "effective_at": dt.datetime.now(dt.UTC) - dt.timedelta(days=1),
            "author_persona_key": "publisher",
            "created_by": SEED_ACTOR,
            "updated_by": SEED_ACTOR,
        },
    )
    get_or_create(
        db,
        Announcement,
        {"title": "Upcoming Quarterly Attestation Window"},
        {
            "body": (
                "Draft: the quarterly application ownership certification window opens soon. "
                "This announcement is still being prepared."
            ),
            "status": "Draft",
            "priority": "Normal",
            "featured": False,
            "author_persona_key": "publisher",
            "created_by": SEED_ACTOR,
            "updated_by": SEED_ACTOR,
        },
    )


def _seed_attestations(db: Session) -> None:
    app_ownership_def = get_or_create(
        db,
        AttestationDefinition,
        {"name": "Quarterly Application Ownership Certification"},
        {
            "description": "Certifies application ownership, criticality, and lifecycle accuracy.",
            "category": "Applications",
            "created_by": SEED_ACTOR,
            "updated_by": SEED_ACTOR,
        },
    )
    if not app_ownership_def.questions:
        questions = [
            ("Is the application owner information still accurate?", "boolean", True, None, 0),
            ("Confirm the current lifecycle state.", "choice", True, ["Planned", "Active", "Sunset", "Retired"], 1),
            ("Provide any additional ownership notes.", "text", False, None, 2),
            ("Last architecture review date.", "date", True, None, 3),
        ]
        for prompt, qtype, required, options, order in questions:
            db.add(
                AttestationQuestion(
                    definition_id=app_ownership_def.id,
                    prompt=prompt,
                    question_type=qtype,
                    required=required,
                    options_json=json_dumps(options) if options else None,
                    order_index=order,
                    created_by=SEED_ACTOR,
                    updated_by=SEED_ACTOR,
                )
            )
        db.flush()

    workforce_capability_def = get_or_create(
        db,
        AttestationDefinition,
        {"name": "Workforce Capability Validation"},
        {
            "description": "Validates capability mappings and proficiency for workforce members.",
            "category": "Workforce",
            "created_by": SEED_ACTOR,
            "updated_by": SEED_ACTOR,
        },
    )
    if not workforce_capability_def.questions:
        questions = [
            ("Are your assigned capabilities still accurate?", "boolean", True, None, 0),
            ("Select your primary capability category.", "choice", True, ["Engineering", "Security", "Data", "Domain", "Delivery"], 1),
            ("Estimated proficiency score (1-10).", "numeric", True, None, 2),
            ("Date of most recent skills self-assessment.", "date", False, None, 3),
        ]
        for prompt, qtype, required, options, order in questions:
            db.add(
                AttestationQuestion(
                    definition_id=workforce_capability_def.id,
                    prompt=prompt,
                    question_type=qtype,
                    required=required,
                    options_json=json_dumps(options) if options else None,
                    order_index=order,
                    created_by=SEED_ACTOR,
                    updated_by=SEED_ACTOR,
                )
            )
        db.flush()

    app_campaign = get_or_create(
        db,
        AttestationCampaign,
        {"name": "Q3 Application Ownership Certification"},
        {
            "definition_id": app_ownership_def.id,
            "description": "Quarterly certification cycle for application ownership records.",
            "opens_at": dt.datetime.now(dt.UTC) - dt.timedelta(days=5),
            "closes_at": dt.datetime.now(dt.UTC) + dt.timedelta(days=25),
            "created_by": SEED_ACTOR,
            "updated_by": SEED_ACTOR,
        },
    )
    workforce_campaign = get_or_create(
        db,
        AttestationCampaign,
        {"name": "Annual Workforce Capability Validation"},
        {
            "definition_id": workforce_capability_def.id,
            "description": "Annual validation cycle for workforce capability mappings.",
            "opens_at": dt.datetime.now(dt.UTC) - dt.timedelta(days=3),
            "closes_at": dt.datetime.now(dt.UTC) + dt.timedelta(days=40),
            "created_by": SEED_ACTOR,
            "updated_by": SEED_ACTOR,
        },
    )

    persona_keys = ["executive", "manager", "steward", "publisher", "admin"]
    for campaign in (app_campaign, workforce_campaign):
        for persona_key in persona_keys:
            get_or_create(
                db,
                AttestationAssignment,
                {"campaign_id": campaign.id, "assignee_persona_key": persona_key},
                {
                    "status": "Draft",
                    "acknowledgement": False,
                    "created_by": SEED_ACTOR,
                    "updated_by": SEED_ACTOR,
                },
            )


def run_seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        _seed_personas(db)
        org_units, teams = _seed_org(db)
        people = _seed_people(db, org_units, teams)
        applications = _seed_applications(db, people)
        platforms = _seed_platforms(db, people)
        capabilities = _seed_capabilities(db)
        assets = _seed_assets(db, people)
        _seed_relationships(db, people, teams, applications, platforms, capabilities, assets)
        _seed_announcements(db)
        _seed_attestations(db)
        db.commit()
        print("Seed complete.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
