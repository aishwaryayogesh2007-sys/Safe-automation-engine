import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.seed import seed_database
from app.models.user import User

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("ao04")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas on startup
    logger.info("Initializing database schemas...")
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            # Check if seeding is needed
            if db.query(User).count() == 0:
                logger.info("Database empty, running initial seed...")
                seed_database(db)
            else:
                logger.info("Database already initialized and seeded.")
        finally:
            db.close()
    except Exception as exc:
        logger.error("Database initialization failed: %s", exc)
    yield
    logger.info("Shutting down AO-04 application...")


app = FastAPI(
    title="AO-04 Safe Autonomous IT Operations Remediation Platform",
    description="Safety-first autonomous IT operations, chaos remediation, and policy-governed control plane.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routes under /api
app.include_router(api_router)


@app.get("/health", tags=["Health"])
def health_check():
    """Liveness probe for backend application."""
    return {
        "status": "ok",
        "platform": "AO-04 Safe Autonomous IT Operations",
        "environment": settings.ENVIRONMENT,
        "database_backend": "sqlite" if "sqlite" in settings.effective_database_url else "postgresql",
    }
