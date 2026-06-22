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
# Import every SQLModel table model so SQLModel.metadata is fully populated.
# Uncomment as each feature is built out.

# from app.features.users.models import User          # noqa: F401
# from app.features.sites.models import Site          # noqa: F401
# from app.features.suppliers.models import Supplier  # noqa: F401
# from app.features.inventory.models import *         # noqa: F401, F403
# from app.features.transfers.models import *         # noqa: F401, F403
# from app.features.orders.models import *            # noqa: F401, F403
