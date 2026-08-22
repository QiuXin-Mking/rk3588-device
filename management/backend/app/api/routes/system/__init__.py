from fastapi import APIRouter

from . import menus, users, workspaces

system_router = APIRouter()
system_router.include_router(users.router)
system_router.include_router(menus.router)
system_router.include_router(workspaces.router)
