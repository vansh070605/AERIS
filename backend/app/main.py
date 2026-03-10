"""
Main FastAPI Application — AEIRAS
Supports SQLite (local dev) and PostgreSQL+PostGIS (production).
"""

from contextlib import asynccontextmanager
import logging
import time

from fastapi import FastAPI, Request, status
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
    # Startup
    logger.info("=== AEIRAS Starting Up ===")
    logger.info(f"Database: {'SQLite (dev)' if settings.USE_SQLITE else 'PostgreSQL+PostGIS'}")

    await init_db()
    logger.info("Database tables created")

    # Seed initial data
    async with AsyncSessionLocal() as db:
        try:
            from app.utils.seed_data import seed_database
            await seed_database(db)
            await db.commit()
        except Exception as e:
            logger.error(f"Seeding error: {e}")
            await db.rollback()

    # Pre-train ML model
    try:
        from app.services.ml_service import ml_service
        if not ml_service.is_trained:
            ml_service.train_model()
            logger.info("ML model trained")
    except Exception as e:
        logger.warning(f"ML model init warning: {e}")

    # Seed synthetic Chennai incidents
    async with AsyncSessionLocal() as db:
        try:
            from app.utils.chennai_incidents import seed_incidents
            await seed_incidents(db, n=5000)
            await db.commit()
        except Exception as e:
            logger.error(f"Incident seeding error: {e}")
            await db.rollback()

    logger.info("=== AEIRAS Ready ===")
    yield

    # Shutdown
    logger.info("AEIRAS shutting down...")
    await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Assisted Emergency Response and Resource Mapping System",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────────────────────────────────
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


# ── Exception Handlers ──────────────────────────────────────────────
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


# ── Routes ──────────────────────────────────────────────────────────
from app.api.routes import auth, emergency, resources, dispatch, analytics, websocket  # noqa

app.include_router(auth.router, prefix="/api/v1")
app.include_router(emergency.router, prefix="/api/v1")
app.include_router(resources.router, prefix="/api/v1")
app.include_router(dispatch.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(websocket.router)


# ── Health Check ────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "db_mode": "sqlite" if settings.USE_SQLITE else "postgresql",
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "AEIRAS API",
        "docs": "/docs",
        "version": settings.APP_VERSION,
    }
