from fastapi import APIRouter

from .resources import (
    cloud_storage_router,
    collection_scenes_router,
    collection_sops_router,
    dashboard_router,
    device_bindings_router,
    feedback_router,
    physical_kits_router,
    product_kits_router,
    records_router,
    tasks_router,
    versions_router,
)

ego_router = APIRouter()
ego_router.include_router(dashboard_router)
ego_router.include_router(product_kits_router)
ego_router.include_router(physical_kits_router)
ego_router.include_router(collection_sops_router)
ego_router.include_router(collection_scenes_router)
ego_router.include_router(device_bindings_router)
ego_router.include_router(tasks_router)
ego_router.include_router(records_router)
ego_router.include_router(cloud_storage_router)
ego_router.include_router(feedback_router)
ego_router.include_router(versions_router)
