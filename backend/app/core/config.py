from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AERIS — Urban Flood Response Optimization System"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./aeiras_dev.db"
    DATABASE_URL_SYNC: str = "sqlite:///./aeiras_dev.db"
    USE_SQLITE: bool = True

    # Redis
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
        "http://127.0.0.1:5173",
    ]

    # ML — Flood Models
    ML_MODEL_PATH: str = "app/ml/models/"
    ML_PREDICTION_TIMEOUT: float = 0.2

    # Routing — Flood-aware
    ROUTING_TIMEOUT: float = 0.3
    MAX_ROUTING_DISTANCE_KM: float = 100.0

    # Flood-specific config
    CHENNAI_BOUNDS: dict = {
        "lat_min": 12.85, "lat_max": 13.25,
        "lon_min": 80.05, "lon_max": 80.35,
    }
    MONSOON_MONTHS: List[int] = [10, 11, 12]  # Oct-Dec NE monsoon
    FLOOD_RISK_THRESHOLD: float = 0.7  # zones above this are "high risk"

    # WebSocket
    WS_HEARTBEAT_INTERVAL: int = 30

    # Pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
