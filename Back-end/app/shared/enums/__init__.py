"""
shared/enums/__init__.py
========================
Consolidated application-wide enumerations.

Move shared enums here once they are needed in more than one feature.
Feature-specific enums that are co-located with their models (e.g.,
UserRole in features/users/models.py) should be migrated here when
they become cross-cutting concerns.

Examples to migrate over time:
    UserRole            → from app.features.users.models
    MaintenanceStatus   → from app.features.maintenance (future)
    InverterStatus      → from app.features.inverters (future)
"""

# Placeholder — populate as enums become cross-cutting.
