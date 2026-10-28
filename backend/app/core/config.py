import socket
from functools import lru_cache
from typing import Optional
from urllib.parse import urlparse
from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql://ao04user:ao04pass@localhost:5432/ao04db"
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production-ao04-safe-remediation"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    ALLOW_SQLITE_FALLBACK: bool = True
    SQLITE_URL: str = "sqlite:///./ao04_dev.db"

    _cached_effective_url: Optional[str] = None

    @computed_field
    @property
    def effective_database_url(self) -> str:
        if self._cached_effective_url:
            return self._cached_effective_url

        if not self.ALLOW_SQLITE_FALLBACK:
            self._cached_effective_url = self.DATABASE_URL
            return self.DATABASE_URL

        # If it's already sqlite, use it directly
        if self.DATABASE_URL.startswith("sqlite"):
            self._cached_effective_url = self.DATABASE_URL
            return self.DATABASE_URL

        # Try socket probe for PostgreSQL or other remote databases
        try:
            parsed = urlparse(self.DATABASE_URL)
            host = parsed.hostname or "localhost"
            port = parsed.port or 5432
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.6)
            result = sock.connect_ex((host, port))
            sock.close()
            if result == 0:
                self._cached_effective_url = self.DATABASE_URL
                return self.DATABASE_URL
            else:
                self._cached_effective_url = self.SQLITE_URL
                return self.SQLITE_URL
        except Exception:
            self._cached_effective_url = self.SQLITE_URL
            return self.SQLITE_URL


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
