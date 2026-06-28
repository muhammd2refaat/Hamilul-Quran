"""
core/config.py — DEPRECATED SHIM
==================================
This module has been moved to app.config.settings.
This file remains as a backward-compatibility re-export so existing imports
don't break while you migrate each feature module.

TODO: Replace all usages of `from app.core.config import ...` with
      `from app.config.settings import ...` and delete this file.
"""

from app.config.settings import Settings, get_settings, settings  # noqa: F401

__all__ = ["Settings", "get_settings", "settings"]
