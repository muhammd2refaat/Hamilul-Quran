"""
core/database.py — DEPRECATED SHIM
=====================================
This module has been moved to app.database.session.
This file remains as a backward-compatibility re-export so existing imports
don't break while you migrate each feature module.

TODO: Replace all usages of `from app.core.database import ...` with
      `from app.database.session import ...` and delete this file.
"""

from app.database.session import (  # noqa: F401
    engine,
    AsyncSessionFactory,
    get_session,
    create_all_tables,
    drop_all_tables,
)

__all__ = [
    "engine",
    "AsyncSessionFactory",
    "get_session",
    "create_all_tables",
    "drop_all_tables",
]
