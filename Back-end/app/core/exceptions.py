"""
core/exceptions.py
===================
Custom application exception classes.

Define domain-level exception classes here. HTTP handler registration
(the @app.exception_handler wiring) lives in core/handlers.py — keeping
class definitions and framework wiring separate.

Usage:
    raise NotFoundError("Site not found")
    raise PermissionDeniedError("Admin access required")

FastAPI/Starlette will catch these via the handlers in core/handlers.py
if you register them, or they will fall through to the global Exception
handler which returns a 500 response.
"""


class AppException(Exception):
    """Base class for all application-level exceptions."""

    def __init__(self, message: str, error_code: str = "APP_ERROR") -> None:
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class NotFoundError(AppException):
    """Raised when a requested resource does not exist."""

    def __init__(self, message: str = "The requested resource was not found.") -> None:
        super().__init__(message, error_code="NOT_FOUND")


class PermissionDeniedError(AppException):
    """Raised when the authenticated user lacks the required permission."""

    def __init__(self, message: str = "You do not have permission to perform this action.") -> None:
        super().__init__(message, error_code="PERMISSION_DENIED")


class ConflictError(AppException):
    """Raised when an operation conflicts with the current state (e.g., duplicate)."""

    def __init__(self, message: str = "A conflict occurred with the current state.") -> None:
        super().__init__(message, error_code="CONFLICT")


class ValidationError(AppException):
    """Raised for business-rule validation failures (distinct from Pydantic schema errors)."""

    def __init__(self, message: str = "The provided data failed business rule validation.") -> None:
        super().__init__(message, error_code="VALIDATION_ERROR")
