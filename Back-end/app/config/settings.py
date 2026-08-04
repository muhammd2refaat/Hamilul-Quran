from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Hamilul-Quran"
    app_env: str = "development"
    debug: bool = True
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://muhammedrefaat@localhost:5432/hamilul_quran_db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    secret_key: str = "CHANGE_ME_TO_A_RANDOM_64_CHAR_HEX_STRING"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # Starlette session (used by Authlib for OAuth state/nonce)
    session_secret: str = "CHANGE_ME_TO_A_RANDOM_SESSION_SECRET"

    # Fernet key for encrypting stored Google refresh tokens at rest.
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    token_encryption_key: str = "CHANGE_ME_TO_A_FERNET_KEY"

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"
    # Space-separated OAuth scopes. Includes Calendar so future lesson scheduling
    # can create events on the user's behalf.
    google_oauth_scopes: str = (
        "openid email profile https://www.googleapis.com/auth/calendar.events"
    )

    # Pending-registration handoff TTL (seconds) for the Redis-stored blob.
    registration_token_ttl_seconds: int = 15 * 60

    # Frontend base URL — where OAuth callbacks redirect the browser back to.
    frontend_url: str = "http://localhost:3000"

    # Local filesystem directory for uploaded teacher certificates.
    upload_dir: str = "uploads"

    allowed_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    # Admin seed credentials
    admin_email: str = "admin@elhafazah-academy.com"
    admin_password: str = "Admin@123456"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
