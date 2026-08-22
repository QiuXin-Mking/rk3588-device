import secrets
import uuid
import warnings
from pathlib import Path
from typing import Literal

from pydantic import (
    AnyUrl,
    HttpUrl,
    PostgresDsn,
    computed_field,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing_extensions import Self


class Settings(BaseSettings):
    _ROOT_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
    model_config = SettingsConfigDict(
        # Always resolve project root .env regardless of startup cwd
        env_file=str(_ROOT_ENV_PATH),
        env_ignore_empty=True,
        extra="ignore",
    )
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = secrets.token_urlsafe(32)

    # --- Audit Log Configuration ---
    # Tables present in this list will be captured by the interceptor automatically
    # and recorded into the dynamically partitioned audit log. Fully non-intrusive.
    AUDITABLE_TABLES: set[str] = {
        "role",
        "user",
        "business_line",
        "workspace",
        "product_kit",
        "device_binding",
        "collection_task",
        "collection_record",
        "cloud_storage",
        "feedback",
        "release_version",
    }
    # 60 minutes * 24 hours * 8 days = 8 days
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    FRONTEND_HOST: str = "http://localhost:5174"
    ENVIRONMENT: Literal["local", "staging", "production"] = "local"

    BACKEND_CORS_ORIGINS: list[AnyUrl] | str = []

    @computed_field
    @property
    def all_cors_origins(self) -> list[str]:
        return [str(origin).rstrip("/") for origin in self.BACKEND_CORS_ORIGINS] + [
            self.FRONTEND_HOST
        ]

    PROJECT_NAME: str
    SENTRY_DSN: HttpUrl | None = None
    POSTGRES_SERVER: str
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = ""
    POSTGRES_SHADOW_DB: str = "ego_management_shadow"
    POSTGRES_TEST_DB: str = "ego_management_test"

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_DB,
        )

    @computed_field
    @property
    def SQLALCHEMY_SHADOW_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_SHADOW_DB,
        )

    @computed_field
    @property
    def SQLALCHEMY_TEST_DATABASE_URI(self) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_SERVER,
            port=self.POSTGRES_PORT,
            path=self.POSTGRES_TEST_DB,
        )

    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 48

    FIRST_SUPERUSER: str
    FIRST_SUPERUSER_PASSWORD: str
    DEFAULT_WORKSPACE_ID: uuid.UUID = uuid.UUID("11111111-1111-4111-8111-111111111111")
    DEFAULT_WORKSPACE_NAME: str = "Ego Collection"

    # --- Object storage (optional; hardware/storage integration is out of scope) ---
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET_NAME: str = "ego-management"
    MINIO_USE_HTTPS: bool = False
    # Upload thresholds (bytes)
    MINIO_CHUNK_THRESHOLD: int = 20 * 1024 * 1024  # 20MB
    MINIO_CHUNK_SIZE: int = 10 * 1024 * 1024  # 10MB
    MINIO_MAX_FILE_SIZE: int = 1024 * 1024 * 1024  # 1GB

    def _check_default_secret(self, var_name: str, value: str | None) -> None:
        if value == "changethis":
            message = (
                f'The value of {var_name} is "changethis", '
                "for security, please change it, at least for deployments."
            )
            if self.ENVIRONMENT == "local":
                warnings.warn(message, stacklevel=1)
            else:
                raise ValueError(message)

    @model_validator(mode="after")
    def _enforce_non_default_secrets(self) -> Self:
        self._check_default_secret("SECRET_KEY", self.SECRET_KEY)
        self._check_default_secret("POSTGRES_PASSWORD", self.POSTGRES_PASSWORD)
        self._check_default_secret(
            "FIRST_SUPERUSER_PASSWORD", self.FIRST_SUPERUSER_PASSWORD
        )

        return self


settings = Settings()  # ty: ignore
