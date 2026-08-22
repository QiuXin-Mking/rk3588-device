import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlmodel import SQLModel, col, select

from app import dao
from app.api.deps import (
    AsyncSessionDep,
    CurrentUser,
    CurrentWorkspaceMember,
    get_current_workspace_member,
    require_perm,
)
from app.api.name_resolver import resolve_names
from app.core.exceptions import BusinessException
from app.model.common import GenericPage, Message
from app.model.ego.resources import (
    CloudStorage,
    CloudStorageCreate,
    CloudStoragePublic,
    CloudStorageUpdate,
    CollectionRecord,
    CollectionRecordCreate,
    CollectionRecordPublic,
    CollectionRecordUpdate,
    CollectionScene,
    CollectionSceneCreate,
    CollectionScenePublic,
    CollectionSceneUpdate,
    CollectionSop,
    CollectionSopCreate,
    CollectionSopPublic,
    CollectionSopUpdate,
    CollectionTask,
    CollectionTaskClaim,
    CollectionTaskCreate,
    CollectionTaskPublic,
    CollectionTaskUpdate,
    DashboardSummary,
    DeviceBinding,
    DeviceBindingCreate,
    DeviceBindingPublic,
    DeviceBindingUpdate,
    Feedback,
    FeedbackCreate,
    FeedbackPublic,
    FeedbackUpdate,
    OperatorTerminalConfig,
    PhysicalKit,
    PhysicalKitCreate,
    PhysicalKitPublic,
    PhysicalKitUpdate,
    ProductKit,
    ProductKitCreate,
    ProductKitPublic,
    ProductKitUpdate,
    ReleaseVersion,
    ReleaseVersionCreate,
    ReleaseVersionPublic,
    ReleaseVersionUpdate,
    ResourceListFilter,
)

workspace_dependencies = [Depends(get_current_workspace_member)]

dashboard_router = APIRouter(
    prefix="/dashboard", tags=["ego-dashboard"], dependencies=workspace_dependencies
)
product_kits_router = APIRouter(
    prefix="/product-kits",
    tags=["ego-product-kits"],
    dependencies=workspace_dependencies,
)
physical_kits_router = APIRouter(
    prefix="/physical-kits",
    tags=["ego-physical-kits"],
    dependencies=workspace_dependencies,
)
collection_sops_router = APIRouter(
    prefix="/collection-sops",
    tags=["ego-collection-sops"],
    dependencies=workspace_dependencies,
)
collection_scenes_router = APIRouter(
    prefix="/collection-scenes",
    tags=["ego-collection-scenes"],
    dependencies=workspace_dependencies,
)
device_bindings_router = APIRouter(
    prefix="/device-bindings",
    tags=["ego-device-bindings"],
    dependencies=workspace_dependencies,
)
tasks_router = APIRouter(
    prefix="/collection-tasks",
    tags=["ego-collection-tasks"],
    dependencies=workspace_dependencies,
)
records_router = APIRouter(
    prefix="/collection-records",
    tags=["ego-collection-records"],
    dependencies=workspace_dependencies,
)
cloud_storage_router = APIRouter(
    prefix="/cloud-storage",
    tags=["ego-cloud-storage"],
    dependencies=workspace_dependencies,
)
feedback_router = APIRouter(
    prefix="/feedback", tags=["ego-feedback"], dependencies=workspace_dependencies
)
versions_router = APIRouter(
    prefix="/release-versions",
    tags=["ego-release-versions"],
    dependencies=workspace_dependencies,
)


async def _list_resources(
    session: AsyncSessionDep,
    model: type[SQLModel],
    public_model: type[SQLModel],
    filters: ResourceListFilter,
    search_fields: tuple[str, ...],
) -> GenericPage[Any]:
    count, items = await dao.get_resources(
        session=session, model=model, filters=filters, search_fields=search_fields
    )
    public_items = await resolve_names(session, items, public_model)
    return GenericPage(data=public_items, count=count)


async def _create_resource(
    session: AsyncSessionDep,
    model: type[SQLModel],
    public_model: type[SQLModel],
    payload: SQLModel,
) -> Any:
    item = await dao.create_resource(session=session, model=model, payload=payload)
    return (await resolve_names(session, [item], public_model))[0]


async def _update_resource(
    session: AsyncSessionDep,
    model: type[SQLModel],
    public_model: type[SQLModel],
    resource_id: uuid.UUID,
    payload: SQLModel,
) -> Any:
    item = await dao.get_resource_by_id(
        session=session, model=model, resource_id=resource_id
    )
    if item is None:
        raise BusinessException(msg="Resource not found", code=404)
    updated = await dao.update_resource(session=session, db_obj=item, payload=payload)
    return (await resolve_names(session, [updated], public_model))[0]


async def _delete_resource(
    session: AsyncSessionDep, model: type[SQLModel], resource_id: uuid.UUID
) -> Message:
    item = await dao.get_resource_by_id(
        session=session, model=model, resource_id=resource_id
    )
    if item is None:
        raise BusinessException(msg="Resource not found", code=404)
    await dao.delete_resource(session=session, db_obj=item)
    return Message(message="Resource deleted successfully")


async def _resolve_tasks(
    session: AsyncSessionDep, tasks: list[CollectionTask]
) -> list[CollectionTaskPublic]:
    public_tasks = await resolve_names(session, tasks, CollectionTaskPublic)
    sop_ids = {task.sop_id for task in tasks}
    result = await session.exec(
        select(CollectionSop).where(col(CollectionSop.id).in_(sop_ids))
    )
    sops = {sop.id: sop for sop in result.all()}
    kit_ids = {task.kit_id for task in tasks if task.kit_id is not None}
    kits: dict[uuid.UUID, ProductKit] = {}
    if kit_ids:
        kit_result = await session.exec(
            select(ProductKit).where(col(ProductKit.id).in_(kit_ids))
        )
        kits = {kit.id: kit for kit in kit_result.all()}
    return [
        public.model_copy(
            update={
                "kit_name": kits[task.kit_id].name if task.kit_id in kits else "",
                "sop_name": sops[task.sop_id].name if task.sop_id in sops else "",
                "sop_content": sops[task.sop_id].content if task.sop_id in sops else "",
            }
        )
        for task, public in zip(tasks, public_tasks, strict=True)
    ]


async def _resolve_physical_kits(
    session: AsyncSessionDep, items: list[PhysicalKit]
) -> list[PhysicalKitPublic]:
    public_items = await resolve_names(session, items, PhysicalKitPublic)
    template_ids = {item.template_id for item in items}
    result = await session.exec(
        select(ProductKit).where(col(ProductKit.id).in_(template_ids))
    )
    templates = {template.id: template for template in result.all()}
    return [
        PhysicalKitPublic.model_validate(
            {
                **public.model_dump(),
                "template_name": templates[item.template_id].name
                if item.template_id in templates
                else "",
                "device_slots": templates[item.template_id].device_slots
                if item.template_id in templates
                else [],
            }
        )
        for item, public in zip(items, public_items, strict=True)
    ]


async def _get_physical_kit_template(
    session: AsyncSessionDep, physical_kit_id: uuid.UUID
) -> tuple[PhysicalKit, ProductKit]:
    physical_kit = await dao.get_resource_by_id(
        session=session, model=PhysicalKit, resource_id=physical_kit_id
    )
    if physical_kit is None:
        raise BusinessException(msg="Physical kit not found", code=404)
    template = await dao.get_resource_by_id(
        session=session, model=ProductKit, resource_id=physical_kit.template_id
    )
    if template is None:
        raise BusinessException(msg="Product kit template not found", code=404)
    return physical_kit, template


async def _validate_device_slot(
    session: AsyncSessionDep, payload: DeviceBindingCreate | DeviceBindingUpdate
) -> None:
    if payload.physical_kit_id is None:
        return
    _, template = await _get_physical_kit_template(
        session, payload.physical_kit_id
    )
    roles = {
        slot["role"] if isinstance(slot, dict) else slot.role
        for slot in template.device_slots
    }
    if payload.slot_role not in roles:
        raise BusinessException(
            msg="Device slot role is not defined by the selected template", code=409
        )


async def _validate_task_sop(session: AsyncSessionDep, sop_id: uuid.UUID) -> None:
    sop = await dao.get_resource_by_id(
        session=session, model=CollectionSop, resource_id=sop_id
    )
    if sop is None:
        raise BusinessException(msg="SOP not found", code=404)


@dashboard_router.get(
    "/summary",
    response_model=DashboardSummary,
    dependencies=[Depends(require_perm("ego_dashboard:read"))],
)
async def read_dashboard_summary(
    session: AsyncSessionDep, _member: CurrentWorkspaceMember
) -> DashboardSummary:
    return await dao.get_dashboard_summary(session=session)


@product_kits_router.get(
    "/",
    response_model=GenericPage[ProductKitPublic],
    dependencies=[Depends(require_perm("product_kits:list"))],
)
async def read_product_kits(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session, ProductKit, ProductKitPublic, filters, ("code", "name", "product_type")
    )


@product_kits_router.post(
    "/",
    response_model=ProductKitPublic,
    dependencies=[Depends(require_perm("product_kits:create"))],
)
async def create_product_kit(
    session: AsyncSessionDep, payload: ProductKitCreate
) -> Any:
    return await _create_resource(session, ProductKit, ProductKitPublic, payload)


@product_kits_router.put(
    "/{resource_id}",
    response_model=ProductKitPublic,
    dependencies=[Depends(require_perm("product_kits:update"))],
)
async def update_product_kit(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: ProductKitUpdate
) -> Any:
    return await _update_resource(
        session, ProductKit, ProductKitPublic, resource_id, payload
    )


@product_kits_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("product_kits:delete"))],
)
async def delete_product_kit(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    return await _delete_resource(session, ProductKit, resource_id)


@physical_kits_router.get(
    "/",
    response_model=GenericPage[PhysicalKitPublic],
    dependencies=[Depends(require_perm("physical_kits:list"))],
)
async def read_physical_kits(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    count, items = await dao.get_resources(
        session=session,
        model=PhysicalKit,
        filters=filters,
        search_fields=("serial_number", "name", "terminal_serial", "bound_username"),
    )
    return GenericPage(data=await _resolve_physical_kits(session, items), count=count)


@physical_kits_router.post(
    "/",
    response_model=PhysicalKitPublic,
    dependencies=[Depends(require_perm("physical_kits:create"))],
)
async def create_physical_kit(
    session: AsyncSessionDep, payload: PhysicalKitCreate
) -> Any:
    template = await dao.get_resource_by_id(
        session=session, model=ProductKit, resource_id=payload.template_id
    )
    if template is None:
        raise BusinessException(msg="Product kit template not found", code=404)
    item = await dao.create_resource(
        session=session, model=PhysicalKit, payload=payload
    )
    return (await _resolve_physical_kits(session, [item]))[0]


@physical_kits_router.put(
    "/{resource_id}",
    response_model=PhysicalKitPublic,
    dependencies=[Depends(require_perm("physical_kits:update"))],
)
async def update_physical_kit(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: PhysicalKitUpdate
) -> Any:
    template = await dao.get_resource_by_id(
        session=session, model=ProductKit, resource_id=payload.template_id
    )
    if template is None:
        raise BusinessException(msg="Product kit template not found", code=404)
    item = await dao.get_resource_by_id(
        session=session, model=PhysicalKit, resource_id=resource_id
    )
    if item is None:
        raise BusinessException(msg="Resource not found", code=404)
    updated = await dao.update_resource(session=session, db_obj=item, payload=payload)
    return (await _resolve_physical_kits(session, [updated]))[0]


@physical_kits_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("physical_kits:delete"))],
)
async def delete_physical_kit(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    linked_device = (
        await session.exec(
            select(DeviceBinding).where(DeviceBinding.physical_kit_id == resource_id)
        )
    ).first()
    if linked_device is not None:
        raise BusinessException(msg="Physical kit still contains devices", code=409)
    return await _delete_resource(session, PhysicalKit, resource_id)


@collection_sops_router.get(
    "/",
    response_model=GenericPage[CollectionSopPublic],
    dependencies=[Depends(require_perm("collection_sops:list"))],
)
async def read_collection_sops(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session, CollectionSop, CollectionSopPublic, filters, ("name", "content")
    )


@collection_sops_router.post(
    "/",
    response_model=CollectionSopPublic,
    dependencies=[Depends(require_perm("collection_sops:create"))],
)
async def create_collection_sop(
    session: AsyncSessionDep, payload: CollectionSopCreate
) -> Any:
    return await _create_resource(session, CollectionSop, CollectionSopPublic, payload)


@collection_sops_router.put(
    "/{resource_id}",
    response_model=CollectionSopPublic,
    dependencies=[Depends(require_perm("collection_sops:update"))],
)
async def update_collection_sop(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: CollectionSopUpdate
) -> Any:
    return await _update_resource(
        session, CollectionSop, CollectionSopPublic, resource_id, payload
    )


@collection_sops_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("collection_sops:delete"))],
)
async def delete_collection_sop(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    linked_task = (
        await session.exec(
            select(CollectionTask).where(CollectionTask.sop_id == resource_id)
        )
    ).first()
    if linked_task is not None:
        raise BusinessException(msg="SOP is referenced by collection tasks", code=409)
    return await _delete_resource(session, CollectionSop, resource_id)


@collection_scenes_router.get(
    "/",
    response_model=GenericPage[CollectionScenePublic],
    dependencies=[Depends(require_perm("collection_scenes:list"))],
)
async def read_collection_scenes(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session,
        CollectionScene,
        CollectionScenePublic,
        filters,
        ("name", "description"),
    )


@collection_scenes_router.post(
    "/",
    response_model=CollectionScenePublic,
    dependencies=[Depends(require_perm("collection_scenes:create"))],
)
async def create_collection_scene(
    session: AsyncSessionDep, payload: CollectionSceneCreate
) -> Any:
    return await _create_resource(
        session, CollectionScene, CollectionScenePublic, payload
    )


@collection_scenes_router.put(
    "/{resource_id}",
    response_model=CollectionScenePublic,
    dependencies=[Depends(require_perm("collection_scenes:update"))],
)
async def update_collection_scene(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: CollectionSceneUpdate
) -> Any:
    scene = await dao.get_resource_by_id(
        session=session, model=CollectionScene, resource_id=resource_id
    )
    if scene is None:
        raise BusinessException(msg="Resource not found", code=404)
    old_name = scene.name
    updated = await dao.update_resource(session=session, db_obj=scene, payload=payload)
    if old_name != updated.name:
        tasks = list(
            (
                await session.exec(
                    select(CollectionTask).where(CollectionTask.scene_type == old_name)
                )
            ).all()
        )
        for task in tasks:
            task.scene_type = updated.name
            session.add(task)
        await session.commit()
    return (await resolve_names(session, [updated], CollectionScenePublic))[0]


@collection_scenes_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("collection_scenes:delete"))],
)
async def delete_collection_scene(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    scene = await dao.get_resource_by_id(
        session=session, model=CollectionScene, resource_id=resource_id
    )
    if scene is None:
        raise BusinessException(msg="Resource not found", code=404)
    linked_task = (
        await session.exec(
            select(CollectionTask).where(CollectionTask.scene_type == scene.name)
        )
    ).first()
    if linked_task is not None:
        raise BusinessException(msg="Scene is referenced by collection tasks", code=409)
    return await _delete_resource(session, CollectionScene, resource_id)


@device_bindings_router.get(
    "/",
    response_model=GenericPage[DeviceBindingPublic],
    dependencies=[Depends(require_perm("device_bindings:list"))],
)
async def read_device_bindings(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session,
        DeviceBinding,
        DeviceBindingPublic,
        filters,
        ("serial_number", "pid", "device_name", "slot_role"),
    )


@device_bindings_router.get(
    "/mine/config",
    response_model=OperatorTerminalConfig,
    dependencies=[Depends(require_perm("device_bindings:list"))],
)
async def read_my_terminal_config(
    session: AsyncSessionDep, current_user: CurrentUser
) -> Any:
    physical_kit = await dao.get_operator_physical_kit(
        session=session, username=current_user.username
    )
    if physical_kit is None:
        return OperatorTerminalConfig()
    devices = await dao.get_physical_kit_devices(
        session=session, physical_kit_id=physical_kit.id
    )
    template = await dao.get_resource_by_id(
        session=session, model=ProductKit, resource_id=physical_kit.template_id
    )
    return OperatorTerminalConfig(
        physical_kit=(await _resolve_physical_kits(session, [physical_kit]))[0],
        devices=await resolve_names(session, devices, DeviceBindingPublic),
        template=(
            (await resolve_names(session, [template], ProductKitPublic))[0]
            if template
            else None
        )
    )


@device_bindings_router.post(
    "/",
    response_model=DeviceBindingPublic,
    dependencies=[Depends(require_perm("device_bindings:create"))],
)
async def create_device_binding(
    session: AsyncSessionDep, payload: DeviceBindingCreate
) -> Any:
    await _validate_device_slot(session, payload)
    return await _create_resource(session, DeviceBinding, DeviceBindingPublic, payload)


@device_bindings_router.put(
    "/{resource_id}",
    response_model=DeviceBindingPublic,
    dependencies=[Depends(require_perm("device_bindings:update"))],
)
async def update_device_binding(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: DeviceBindingUpdate
) -> Any:
    await _validate_device_slot(session, payload)
    return await _update_resource(
        session, DeviceBinding, DeviceBindingPublic, resource_id, payload
    )


@device_bindings_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("device_bindings:delete"))],
)
async def delete_device_binding(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    return await _delete_resource(session, DeviceBinding, resource_id)


@tasks_router.get(
    "/",
    response_model=GenericPage[CollectionTaskPublic],
    dependencies=[Depends(require_perm("collection_tasks:list"))],
)
async def read_collection_tasks(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    count, tasks = await dao.get_resources(
        session=session,
        model=CollectionTask,
        filters=filters,
        search_fields=(
            "task_no",
            "project_name",
            "name",
            "subtask_name",
            "scene_type",
            "assigned_username",
            "device_serial",
        ),
    )
    return GenericPage(data=await _resolve_tasks(session, tasks), count=count)


@tasks_router.get(
    "/mine/current",
    response_model=CollectionTaskPublic | None,
    dependencies=[Depends(require_perm("collection_tasks:list"))],
)
async def read_my_current_task(
    session: AsyncSessionDep, current_user: CurrentUser
) -> Any:
    task = await dao.get_operator_current_task(
        session=session, username=current_user.username
    )
    if task is None:
        return None
    return (await _resolve_tasks(session, [task]))[0]


@tasks_router.get(
    "/mine/available",
    response_model=list[CollectionTaskPublic],
    dependencies=[Depends(require_perm("collection_tasks:list"))],
)
async def read_my_available_tasks(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    limit: int = Query(default=100, ge=1, le=500),
    q: str | None = Query(default=None, max_length=128),
    scene_type: str | None = Query(default=None, max_length=64),
    task_no: str | None = Query(default=None, max_length=64),
) -> Any:
    tasks = await dao.get_operator_available_tasks(
        session=session,
        username=current_user.username,
        limit=limit,
        q=q,
        scene_type=scene_type,
        task_no=task_no,
    )
    return await _resolve_tasks(session, tasks)


@tasks_router.post(
    "/",
    response_model=CollectionTaskPublic,
    dependencies=[Depends(require_perm("collection_tasks:create"))],
)
async def create_collection_task(
    session: AsyncSessionDep, payload: CollectionTaskCreate
) -> Any:
    await _validate_task_sop(session, payload.sop_id)
    if not payload.task_no.strip():
        payload = payload.model_copy(
            update={"task_no": f"MANGO-{uuid.uuid4().hex[:10].upper()}"}
        )
    task = await dao.create_resource(
        session=session, model=CollectionTask, payload=payload
    )
    return (await _resolve_tasks(session, [task]))[0]


@tasks_router.put(
    "/{resource_id}",
    response_model=CollectionTaskPublic,
    dependencies=[Depends(require_perm("collection_tasks:update"))],
)
async def update_collection_task(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: CollectionTaskUpdate
) -> Any:
    await _validate_task_sop(session, payload.sop_id)
    task = await dao.get_resource_by_id(
        session=session, model=CollectionTask, resource_id=resource_id
    )
    if task is None:
        raise BusinessException(msg="Resource not found", code=404)
    updated = await dao.update_resource(session=session, db_obj=task, payload=payload)
    return (await _resolve_tasks(session, [updated]))[0]


@tasks_router.post(
    "/{resource_id}/claim",
    response_model=CollectionTaskPublic,
    dependencies=[Depends(require_perm("collection_tasks:claim"))],
)
async def claim_task(
    session: AsyncSessionDep,
    resource_id: uuid.UUID,
    current_user: CurrentUser,
    payload: CollectionTaskClaim | None = None,
) -> Any:
    item = await dao.get_collection_task_for_update(
        session=session, resource_id=resource_id
    )
    if item is None:
        raise BusinessException(msg="Task not found", code=404)
    current_task = await dao.get_operator_current_task(
        session=session, username=current_user.username
    )
    if current_task is not None and current_task.id != item.id:
        raise BusinessException(
            msg="Finish the current task before claiming another one", code=409
        )
    physical_kit = await dao.get_operator_physical_kit(
        session=session, username=current_user.username
    )
    if item.kit_id is not None and (
        physical_kit is None or physical_kit.template_id != item.kit_id
    ):
        raise BusinessException(
            msg="Task kit is not bound to the current operator", code=403
        )
    try:
        claim = payload or CollectionTaskClaim()
        claimed = await dao.claim_collection_task(
            session=session,
            task=item,
            username=current_user.username,
            device_serial=physical_kit.serial_number if physical_kit else "",
            location=claim.location,
            target_objects=claim.target_objects,
            object_count=claim.object_count,
        )
    except ValueError as error:
        raise BusinessException(msg=str(error), code=409) from error
    return (await _resolve_tasks(session, [claimed]))[0]


async def _transition_task(
    session: AsyncSessionDep,
    resource_id: uuid.UUID,
    current_user: CurrentUser,
    status: str,
) -> Any:
    item = await dao.get_collection_task_for_update(
        session=session, resource_id=resource_id
    )
    if item is None:
        raise BusinessException(msg="Task not found", code=404)
    try:
        task = await dao.transition_collection_task(
            session=session,
            task=item,
            username=current_user.username,
            target_status=status,
        )
    except PermissionError as error:
        raise BusinessException(msg=str(error), code=403) from error
    except ValueError as error:
        raise BusinessException(msg=str(error), code=409) from error
    return (await _resolve_tasks(session, [task]))[0]


@tasks_router.post(
    "/{resource_id}/start",
    response_model=CollectionTaskPublic,
    dependencies=[Depends(require_perm("collection_tasks:claim"))],
)
async def start_task(
    session: AsyncSessionDep, resource_id: uuid.UUID, current_user: CurrentUser
) -> Any:
    return await _transition_task(session, resource_id, current_user, "IN_PROGRESS")


@tasks_router.post(
    "/{resource_id}/pause",
    response_model=CollectionTaskPublic,
    dependencies=[Depends(require_perm("collection_tasks:claim"))],
)
async def pause_task(
    session: AsyncSessionDep, resource_id: uuid.UUID, current_user: CurrentUser
) -> Any:
    return await _transition_task(session, resource_id, current_user, "PAUSED")


@tasks_router.post(
    "/{resource_id}/complete",
    response_model=CollectionTaskPublic,
    dependencies=[Depends(require_perm("collection_tasks:claim"))],
)
async def complete_task(
    session: AsyncSessionDep, resource_id: uuid.UUID, current_user: CurrentUser
) -> Any:
    return await _transition_task(session, resource_id, current_user, "COMPLETED")


@tasks_router.post(
    "/{resource_id}/abandon",
    response_model=CollectionTaskPublic,
    dependencies=[Depends(require_perm("collection_tasks:claim"))],
)
async def abandon_task(
    session: AsyncSessionDep, resource_id: uuid.UUID, current_user: CurrentUser
) -> Any:
    item = await dao.get_collection_task_for_update(
        session=session, resource_id=resource_id
    )
    if item is None:
        raise BusinessException(msg="Task not found", code=404)
    try:
        task = await dao.abandon_collection_task(
            session=session, task=item, username=current_user.username
        )
    except PermissionError as error:
        raise BusinessException(msg=str(error), code=403) from error
    except ValueError as error:
        raise BusinessException(msg=str(error), code=409) from error
    return (await _resolve_tasks(session, [task]))[0]


@tasks_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("collection_tasks:delete"))],
)
async def delete_collection_task(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    return await _delete_resource(session, CollectionTask, resource_id)


@records_router.get(
    "/",
    response_model=GenericPage[CollectionRecordPublic],
    dependencies=[Depends(require_perm("collection_records:list"))],
)
async def read_collection_records(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session,
        CollectionRecord,
        CollectionRecordPublic,
        filters,
        ("record_no", "task_name", "device_serial", "operator_username", "file_name"),
    )


@records_router.get(
    "/mine",
    response_model=list[CollectionRecordPublic],
    dependencies=[Depends(require_perm("collection_records:list"))],
)
async def read_my_collection_records(
    session: AsyncSessionDep,
    current_user: CurrentUser,
    limit: int = Query(default=500, ge=1, le=1000),
) -> Any:
    records = await dao.get_operator_records(
        session=session, username=current_user.username, limit=limit
    )
    return await resolve_names(session, records, CollectionRecordPublic)


@records_router.post(
    "/",
    response_model=CollectionRecordPublic,
    dependencies=[Depends(require_perm("collection_records:create"))],
)
async def create_collection_record(
    session: AsyncSessionDep, payload: CollectionRecordCreate, current_user: CurrentUser
) -> Any:
    data = payload.model_copy(update={"operator_username": current_user.username})
    if data.task_id:
        task = await dao.get_resource_by_id(
            session=session, model=CollectionTask, resource_id=data.task_id
        )
        if task is None:
            raise BusinessException(msg="Task not found", code=404)
        if task.assigned_username != current_user.username:
            raise BusinessException(
                msg="Task is assigned to another operator", code=403
            )
        data.task_name = task.name
        data.project_name = task.project_name
        data.subtask_name = task.subtask_name
        data.capture_location = task.location
        data.device_serial = task.device_serial
        if task.kit_id:
            kit = await dao.get_resource_by_id(
                session=session, model=ProductKit, resource_id=task.kit_id
            )
            data.kit_name = kit.name if kit else ""
    record = await _create_resource(
        session, CollectionRecord, CollectionRecordPublic, data
    )
    if data.task_id:
        await dao.increment_collection_task(session=session, task=task)
    return record


@records_router.put(
    "/{resource_id}",
    response_model=CollectionRecordPublic,
    dependencies=[Depends(require_perm("collection_records:update"))],
)
async def update_collection_record(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: CollectionRecordUpdate
) -> Any:
    return await _update_resource(
        session, CollectionRecord, CollectionRecordPublic, resource_id, payload
    )


@records_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("collection_records:delete"))],
)
async def delete_collection_record(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    return await _delete_resource(session, CollectionRecord, resource_id)


@cloud_storage_router.get(
    "/",
    response_model=GenericPage[CloudStoragePublic],
    dependencies=[Depends(require_perm("cloud_storage:list"))],
)
async def read_cloud_storage(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session,
        CloudStorage,
        CloudStoragePublic,
        filters,
        ("name", "provider", "bucket", "endpoint"),
    )


@cloud_storage_router.post(
    "/",
    response_model=CloudStoragePublic,
    dependencies=[Depends(require_perm("cloud_storage:create"))],
)
async def create_cloud_storage(
    session: AsyncSessionDep, payload: CloudStorageCreate
) -> Any:
    return await _create_resource(session, CloudStorage, CloudStoragePublic, payload)


@cloud_storage_router.put(
    "/{resource_id}",
    response_model=CloudStoragePublic,
    dependencies=[Depends(require_perm("cloud_storage:update"))],
)
async def update_cloud_storage(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: CloudStorageUpdate
) -> Any:
    return await _update_resource(
        session, CloudStorage, CloudStoragePublic, resource_id, payload
    )


@cloud_storage_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("cloud_storage:delete"))],
)
async def delete_cloud_storage(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    return await _delete_resource(session, CloudStorage, resource_id)


@feedback_router.get(
    "/",
    response_model=GenericPage[FeedbackPublic],
    dependencies=[Depends(require_perm("feedback:list"))],
)
async def read_feedback(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session,
        Feedback,
        FeedbackPublic,
        filters,
        ("category", "content", "contact", "submitter_username"),
    )


@feedback_router.post(
    "/",
    response_model=FeedbackPublic,
    dependencies=[Depends(require_perm("feedback:create"))],
)
async def create_feedback(session: AsyncSessionDep, payload: FeedbackCreate) -> Any:
    return await _create_resource(session, Feedback, FeedbackPublic, payload)


@feedback_router.put(
    "/{resource_id}",
    response_model=FeedbackPublic,
    dependencies=[Depends(require_perm("feedback:update"))],
)
async def update_feedback(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: FeedbackUpdate
) -> Any:
    return await _update_resource(
        session, Feedback, FeedbackPublic, resource_id, payload
    )


@feedback_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("feedback:delete"))],
)
async def delete_feedback(session: AsyncSessionDep, resource_id: uuid.UUID) -> Message:
    return await _delete_resource(session, Feedback, resource_id)


@versions_router.get(
    "/",
    response_model=GenericPage[ReleaseVersionPublic],
    dependencies=[Depends(require_perm("release_versions:list"))],
)
async def read_release_versions(
    session: AsyncSessionDep,
    _member: CurrentWorkspaceMember,
    filters: ResourceListFilter = Query(),
) -> Any:
    return await _list_resources(
        session,
        ReleaseVersion,
        ReleaseVersionPublic,
        filters,
        ("platform", "version", "release_notes"),
    )


@versions_router.post(
    "/",
    response_model=ReleaseVersionPublic,
    dependencies=[Depends(require_perm("release_versions:create"))],
)
async def create_release_version(
    session: AsyncSessionDep, payload: ReleaseVersionCreate
) -> Any:
    return await _create_resource(
        session, ReleaseVersion, ReleaseVersionPublic, payload
    )


@versions_router.put(
    "/{resource_id}",
    response_model=ReleaseVersionPublic,
    dependencies=[Depends(require_perm("release_versions:update"))],
)
async def update_release_version(
    session: AsyncSessionDep, resource_id: uuid.UUID, payload: ReleaseVersionUpdate
) -> Any:
    return await _update_resource(
        session, ReleaseVersion, ReleaseVersionPublic, resource_id, payload
    )


@versions_router.delete(
    "/{resource_id}",
    response_model=Message,
    dependencies=[Depends(require_perm("release_versions:delete"))],
)
async def delete_release_version(
    session: AsyncSessionDep, resource_id: uuid.UUID
) -> Message:
    return await _delete_resource(session, ReleaseVersion, resource_id)
