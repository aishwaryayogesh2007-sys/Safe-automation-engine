import logging
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings

logger = logging.getLogger(__name__)


def _create_database_engine():
    db_url = settings.effective_database_url

    # Primary attempt
    try:
        if db_url.startswith("sqlite"):
            return create_engine(
                db_url,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
        else:
            eng = create_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=10,
                max_overflow=20,
            )
            # Verify actual connectivity
            with eng.connect() as conn:
                pass
            return eng
    except Exception as exc:
        if settings.ALLOW_SQLITE_FALLBACK:
            logger.warning(
                "Primary database (%s) connection failed: %s. Falling back to SQLite: %s",
                db_url,
                exc,
                settings.SQLITE_URL,
            )
            return create_engine(
                settings.SQLITE_URL,
                connect_args={"check_same_thread": False},
                pool_pre_ping=True,
            )
        raise exc


engine = _create_database_engine()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
