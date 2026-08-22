from fastapi import APIRouter

from . import async_tasks, files, system_audit_logs

infra_router = APIRouter()
infra_router.include_router(system_audit_logs.router)
infra_router.include_router(files.router)
infra_router.include_router(files.public_router)
infra_router.include_router(async_tasks.router)
