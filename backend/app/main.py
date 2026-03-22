"""
Main FastAPI Application — AERIS Urban Flood Response Optimization System
"""

from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.database import init_db, close_db, AsyncSessionLocal

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("=== AERIS Flood Response System Starting Up ===")
    logger.info(f"Database: {'SQLite (dev)' if settings.USE_SQLITE else 'PostgreSQL+PostGIS'}")

    await init_db()
    logger.info("Database tables created")

    # Seed flood-specific data
    async with AsyncSessionLocal() as db:
        try:
            from app.utils.seed_data import seed_database
            await seed_database(db)
            await db.commit()
        except Exception as e:
            logger.error(f"Seeding error: {e}")
            await db.rollback()

    # Pre-train flood ML models
    try:
        from app.services.ml_service import ml_service
        if not ml_service.is_trained:
            ml_service.train_model()
            logger.info("Flood ML models trained")
    except Exception as e:
        logger.warning(f"ML model init warning: {e}")

    # Seed synthetic flood incidents for Chennai
    async with AsyncSessionLocal() as db:
        try:
            from app.utils.flood_incidents_seeder import seed_flood_incidents
            await seed_flood_incidents(db, n=2000)
            await db.commit()
        except Exception as e:
            logger.error(f"Flood incident seeding error: {e}")
            await db.rollback()

    logger.info("=== AERIS Flood Response System Ready ===")
    yield

    logger.info("AERIS shutting down...")
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-driven Urban Flood Disaster Response Optimization System for Tamil Nadu",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=512)


@app.middleware("http")
async def request_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.1f}"
    return response


# Exception Handlers
@app.exception_handler(SQLAlchemyError)
async def db_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"DB error on {request.url}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Database error"})


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# Routes
from app.api.routes import auth, emergency, resources, dispatch, analytics, websocket  # noqa
from app.api.routes import flood_simulation, shelters  # noqa

app.include_router(auth.router, prefix="/api/v1")
app.include_router(emergency.router, prefix="/api/v1")
app.include_router(resources.router, prefix="/api/v1")
app.include_router(dispatch.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(flood_simulation.router, prefix="/api/v1")
app.include_router(shelters.router, prefix="/api/v1")
app.include_router(websocket.router)


# Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "system": "AERIS Flood Response",
        "version": settings.APP_VERSION,
        "region": "Tamil Nadu, India",
        "db_mode": "sqlite" if settings.USE_SQLITE else "postgresql",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "AERIS — Urban Flood Disaster Response Optimization System",
        "region": "Chennai, Tamil Nadu",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }
