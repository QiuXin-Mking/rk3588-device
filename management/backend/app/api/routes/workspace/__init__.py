from fastapi import APIRouter

from . import business_lines, roles, workspace_members

workspace_router = APIRouter()
workspace_router.include_router(roles.router)
workspace_router.include_router(workspace_members.router)
workspace_router.include_router(business_lines.router)
