"""
database/base.py
================
Central import point for all SQLModel table models.

Alembic needs to import every model that defines a DB table *before*
it inspects `SQLModel.metadata`. Add each new feature model here so
`alembic revision --autogenerate` picks it up automatically.

Usage in env.py:
    from app.database.base import *  # noqa: F401, F403
    target_metadata = SQLModel.metadata
"""

from sqlmodel import SQLModel  # noqa: F401  — re-export for env.py

# ─── Feature Models ────────────────────────────────────────────────────────────
# Import every SQLModel table model so SQLModel.metadata is fully populated
# before Alembic inspects it.

from app.features.users.models import User                      # noqa: F401
from app.features.auth.models import GoogleCredential           # noqa: F401
from app.features.teachers.models import TeacherProfile, Ijaza, TeacherReview  # noqa: F401
from app.features.sessions.models import (                      # noqa: F401
    TeacherHistory,
    SessionScore,
    SessionAttendance,
)
from app.features.allocations.models import Allocation          # noqa: F401
from app.features.complaints.models import Complaint            # noqa: F401
from app.features.requests.models import PlatformRequest        # noqa: F401
from app.features.subscriptions.models import Plan, Subscription  # noqa: F401
from app.features.receipts.models import Receipt                # noqa: F401
