import uuid

EGO_OPERATOR_ROLE_ID = uuid.UUID("f0000000-0000-4000-8000-000000000001")
EGO_OPERATOR_PERMISSIONS = (
    "product_kits:list",
    "physical_kits:list",
    "device_bindings:list",
    "collection_tasks:list",
    "collection_tasks:claim",
    "collection_scenes:list",
    "collection_records:list",
    "collection_records:create",
    "cloud_storage:list",
    "feedback:create",
    "release_versions:list",
)
