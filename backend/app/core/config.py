from pydantic_settings import BaseSettings
from typing import List
import secrets


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AEIRAS - AI Emergency Intelligence & Resource Allocation System"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Database — defaults to SQLite for local dev (no PostgreSQL needed)
    DATABASE_URL: str = "sqlite+aiosqlite:///./aeiras_dev.db"
    DATABASE_URL_SYNC: str = "sqlite:///./aeiras_dev.db"
    USE_SQLITE: bool = True   # Set False to use PostgreSQL

    # Redis (optional — Celery disabled without Redis)
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # JWT
    JWT_SECRET_KEY: str = "dev-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    # ML
    ML_MODEL_PATH: str = "app/ml/models/"
    ML_PREDICTION_TIMEOUT: float = 0.2

    # Routing
    ROUTING_TIMEOUT: float = 0.3
    MAX_ROUTING_DISTANCE_KM: float = 100.0

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
