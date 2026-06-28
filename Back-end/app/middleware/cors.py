"""
middleware/cors.py
==================
CORS middleware registration helper.

Extracted from main.py so that middleware configuration lives in its
own dedicated module, matching the middleware/ structure contract.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings


def register_cors(app: FastAPI) -> None:
    """Attach CORSMiddleware to the FastAPI app.

    ``allowed_origins`` is stored as a comma-separated string in settings
    to prevent pydantic-settings from attempting ``json.loads()`` on it.
    We split it here before passing to CORSMiddleware.
    """
    origins = [o.strip() for o in settings.allowed_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
