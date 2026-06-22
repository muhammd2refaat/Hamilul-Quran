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

    # CORS — plain string, comma-separated. Split into a list in main.py.
    # Kept as str to avoid pydantic-settings trying to json.loads() it.
    allowed_origins: str = "http://localhost:3000,http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
