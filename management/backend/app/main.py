from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

import sentry_sdk
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.cors import CORSMiddleware

from app.api.main import api_router
from app.core.config import settings
from app.core.exceptions import (
    BusinessException,
    business_exception_handler,
    sqlalchemy_exception_handler,
)


def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}"


if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Auto-create audit log partitions only when the audit log table is partitioned."""
    from app.core.db import engine

    should_create_partitions = False
    async with engine.begin() as conn:
        try:
            partition_result = await conn.execute(
                text(
                    "SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = "
                    "'system_audit_log') AND EXISTS (SELECT 1 FROM "
                    "pg_partitioned_table WHERE partrelid = "
                    "'system_audit_log'::regclass)"
                )
            )
        except SQLAlchemyError:
            partition_result = None
        should_create_partitions = bool(partition_result and partition_result.scalar())

        if should_create_partitions:
            for table_name in settings.AUDITABLE_TABLES:
                await conn.execute(
                    text(
                        f"CREATE TABLE IF NOT EXISTS audit_log_{table_name} "
                        f"PARTITION OF system_audit_log FOR VALUES IN ('{table_name}');"
                    )
                )

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    generate_unique_id_function=custom_generate_unique_id,
    lifespan=lifespan,
)

# Register global exception handlers
app.add_exception_handler(BusinessException, business_exception_handler)  # type: ignore
app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)  # type: ignore

# Set all CORS enabled origins
if settings.all_cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.all_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

frontend_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
frontend_assets = frontend_dist / "assets"

if settings.ENVIRONMENT == "local" and frontend_dist.exists():
    if frontend_assets.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=frontend_assets),
            name="frontend-assets",
        )

    @app.get("/{full_path:path}", include_in_schema=False, tags=["frontend"])
    async def serve_frontend(full_path: str) -> FileResponse:
        requested_file = frontend_dist / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(frontend_dist / "index.html")
