"""
core/__init__.py
================
Application core — authentication, security, permissions, exception handling,
and application lifecycle utilities.

Public surface:
    security      → JWT creation/decoding, password hashing
    dependencies  → FastAPI dependency functions (get_current_user, role guards)
    exceptions    → Custom application exception classes
    handlers      → register_exception_handlers(app)
    health        → health-check router
"""
