# Configuration

config/
├── settings.py
├── database.py
├── environment.py
├── logging.py
└── secrets.py

Usually Contains
Environment Variables
DATABASE_URL
REDIS_URL
JWT_SECRET
Pydantic Settings

Very common in FastAPI:

from pydantic_settings import BaseSettings