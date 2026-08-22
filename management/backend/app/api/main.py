from fastapi import APIRouter

from app.api.routes import login, utils
from app.api.routes.ego import ego_router
from app.api.routes.infra import infra_router
from app.api.routes.system import system_router
from app.api.routes.workspace import workspace_router

api_router = APIRouter()

# Cross-domain routes (no prefix)
api_router.include_router(login.router)
api_router.include_router(utils.router)

# Domain routes with prefixes
api_router.include_router(system_router, prefix="/system")
api_router.include_router(workspace_router, prefix="/workspace")
api_router.include_router(ego_router, prefix="/ego")

# Infra routes (no prefix)
api_router.include_router(infra_router)
