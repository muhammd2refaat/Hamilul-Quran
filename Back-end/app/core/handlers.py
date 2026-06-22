"""
core/handlers.py
================
FastAPI exception handler registration.

This module wires custom HTTP/DB/validation exception handlers into the
FastAPI application instance.  It is intentionally separate from
core/exceptions.py (which holds the exception *class* definitions) to
follow the single-responsibility principle described in the core/ README.

Usage in main.py / app factory:
    from app.core.handlers import register_exception_handlers
    register_exception_handlers(app)
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, DataError, SQLAlchemyError

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Register all global exception handlers onto the FastAPI application."""

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error_code": "HTTP_EXCEPTION",
                "message": exc.detail,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        errors = []
        for err in exc.errors():
            loc = ".".join([str(loc) for loc in err.get("loc", [])])
            errors.append(f"{loc}: {err.get('msg')}")

        return JSONResponse(
            status_code=422,
            content={
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid request parameters or body.",
                "details": errors,
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError):
        logger.error(f"Integrity Error: {exc}")

        orig = getattr(exc, "orig", exc)
        error_code = "DATABASE_INTEGRITY_ERROR"
        message = "A database integrity constraint was violated."
        details = str(orig)

        if hasattr(orig, "pgcode"):
            if orig.pgcode == "23505":  # unique_violation
                error_code = "UNIQUE_VIOLATION"
                message = "A record with this identifier already exists."
            elif orig.pgcode == "23503":  # foreign_key_violation
                error_code = "FOREIGN_KEY_VIOLATION"
                message = "A referenced record (e.g., Site, User, or Supplier) does not exist."

        return JSONResponse(
            status_code=400,
            content={
                "error_code": error_code,
                "message": message,
                "details": details,
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
        logger.error(f"SQLAlchemy Error: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error_code": "DATABASE_ERROR",
                "message": "An unexpected database error occurred.",
                "details": str(exc),
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled Exception: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error_code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred on the server.",
                "details": str(exc),
            },
        )
